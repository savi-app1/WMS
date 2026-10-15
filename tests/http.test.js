'use strict';
/* Tests d'intégration HTTP — parcours utilisateur complet + sécurité. */
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wms-test-'));
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(tmpDir, 'test.sqlite');
process.env.SESSION_SECRET = 'test-secret-' + 'http'.repeat(16);
process.env.ADMIN_EMAIL = 'admin@test.bf';
process.env.ADMIN_PASSWORD = 'MotDePasseTest1234!';
process.env.WHATSAPP_NUMBER = '22656592557';
process.env.PUBLIC_URL = '';
process.env.COOKIE_SECURE = 'false';

const { test, before, after } = require('node:test');
const assert = require('node:assert');

let server;
let base;
let db;

function request(method, pathname, { body, cookies = '', headers = {}, form = null } = {}) {
  return new Promise((resolve, reject) => {
    let payload = null;
    const allHeaders = { Cookie: cookies, ...headers };
    if (form) {
      payload = new URLSearchParams(form).toString();
      allHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (body) {
      payload = body;
    }
    const req = http.request(base + pathname, { method, headers: allHeaders }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString(),
          setCookie: res.headers['set-cookie'] || [],
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(new Error('timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

function extractCsrf(html) {
  const m = html.match(/name="_csrf" value="([^"]+)"/);
  return m ? m[1] : '';
}

function cookieJar(setCookie) {
  return setCookie.map((c) => c.split(';')[0]).join('; ');
}

before(async () => {
  db = require('../src/db');
  db.open();
  db.run("INSERT INTO categories (slug, name) VALUES ('audio-bluetooth', 'Audio'), ('divers', 'Divers')");
  require('../src/bootstrap');
  const { hashPassword } = require('../src/security');
  db.run('INSERT INTO admin_users (id, email, password_hash) VALUES (1, ?, ?)',
    [process.env.ADMIN_EMAIL, hashPassword(process.env.ADMIN_PASSWORD)]);
  const products = require('../src/services/products');
  products.createProduct({ name: 'Écouteurs HTTP Test', category: 'audio-bluetooth', price_fcfa: 5000, stock_enabled: '1', stock_qty: 10, active: '1' });
  products.createProduct({ name: 'Service Sans Prix HTTP', category: 'divers', price_fcfa: '', active: '1' });
  // produit de démonstration : ne doit jamais être accessible au public
  const demoP = products.createProduct({ name: '[DÉMO] Produit Test Public', category: 'divers', price_fcfa: 1000, active: '1' });
  db.run('UPDATE products SET is_demo = 1 WHERE id = ?', [demoP.id]);

  const { createApp } = require('../src/app');
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.on('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

// ---------- Boutique publique ----------

test('pages publiques accessibles sans compte', async () => {
  for (const p of ['/', '/produits', '/produits?q=ecouteur', '/services', '/contact', '/suivi', '/confidentialite', '/mentions', '/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/sw.js']) {
    const r = await request('GET', p);
    assert.strictEqual(r.status, 200, `${p} → ${r.status}`);
  }
  const home = await request('GET', '/');
  assert.match(home.body, /Wendmanegda/);
  const page404 = await request('GET', '/produit/slug-inexistant');
  assert.strictEqual(page404.status, 404);
});

test('fiche produit publique : prix serveur + formulaire + meta partage', async () => {
  const p = db.get('SELECT * FROM products WHERE price_fcfa = 5000');
  const r = await request('GET', `/produit/${p.slug}`);
  assert.strictEqual(r.status, 200);
  assert.match(r.body, /og:title/);
  assert.match(r.body, /5\s?000\s?FCFA/);
  assert.match(r.body, /name="_csrf"/);
  assert.match(r.body, /Commander ce produit/);
});

test('produit de démonstration : invisible pour le public', async () => {
  const p = db.get('SELECT * FROM products WHERE is_demo = 1');
  assert.ok(p);
  const r = await request('GET', `/produit/${p.slug}`);
  assert.strictEqual(r.status, 404);
  const cat = await request('GET', '/produits');
  assert.ok(!cat.body.includes('[DÉMO]'));
});

test('fiche produit sans prix : « Prix à confirmer »', async () => {
  const p = db.get('SELECT * FROM products WHERE price_fcfa IS NULL');
  const r = await request('GET', `/produit/${p.slug}`);
  assert.match(r.body, /Prix à confirmer/);
});

test('commande valide via HTTP : persistence + numéro unique + statut nouvelle', async () => {
  const prod = db.get('SELECT * FROM products WHERE price_fcfa = 5000');
  const pageResp = await request('GET', `/produit/${prod.slug}`);
  const csrf = extractCsrf(pageResp.body);
  const cookies = cookieJar(pageResp.setCookie);
  const r = await request('POST', '/commander', {
    cookies,
    form: {
      _csrf: csrf,
      customerName: 'Compaore Aicha',
      customerPhone: '76 01 02 03',
      customerAddress: 'Secteur 15 Ouaga, maison 10',
      customerZone: 'Zone A',
      quantity: 2,
      productId: String(prod.id),
      website: '',
    },
  });
  assert.strictEqual(r.status, 200);
  assert.match(r.body, /Commande enregistrée/);
  const m = r.body.match(/WMS-\d{6}-\d{4}/);
  assert.ok(m, `numéro absent de: ${r.body.slice(0, 200)}`);
  const order = db.get('SELECT * FROM orders WHERE order_number = ?', [m[0]]);
  assert.strictEqual(order.status, 'nouvelle');
  assert.strictEqual(order.customer_phone, '22676010203');
  // montant = prix serveur × quantité (livraison à confirmer → total NULL)
  assert.strictEqual(order.prices_incomplete, 0);
  assert.strictEqual(order.amount_ordered, null);
  const item = db.get('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  assert.strictEqual(item.line_total, 10000);
});

test('commande invalide rejetée + honeypot + CSRF requis', async () => {
  const prod = db.get('SELECT * FROM products WHERE price_fcfa = 5000');
  const pageResp = await request('GET', `/produit/${prod.slug}`); // page avec formulaire
  const csrfPage = extractCsrf(pageResp.body);
  assert.ok(csrfPage.length > 10, 'jeton CSRF attendu sur la fiche produit');
  const cookies = cookieJar(pageResp.setCookie);

  // téléphone invalide
  const bad = await request('POST', '/commander', {
    cookies,
    form: { _csrf: csrfPage, customerName: 'X', customerPhone: 'abc', customerAddress: '', quantity: 1, productId: String(prod.id) },
  });
  assert.strictEqual(bad.status, 400);
  assert.match(bad.body, /Numéro de téléphone invalide/);

  // sans CSRF
  const noCsrf = await request('POST', '/commander', {
    form: { customerName: 'X', customerPhone: '70112233', customerAddress: 'Adresse valide', quantity: 1, productId: String(prod.id) },
  });
  assert.strictEqual(noCsrf.status, 400);

  // honeypot : succès simulé, rien en base
  const botCount = db.get('SELECT COUNT(*) n FROM orders').n;
  await request('POST', '/commander', {
    cookies,
    form: { _csrf: csrfPage, customerName: 'Bot', customerPhone: '70112233', customerAddress: 'Adresse test', quantity: 1, productId: String(prod.id), website: 'http://spam' },
  });
  assert.strictEqual(db.get('SELECT COUNT(*) n FROM orders').n, botCount);
});

test('suivi public : masquage des données personnelles', async () => {
  const order = db.get('SELECT * FROM orders ORDER BY id DESC LIMIT 1');
  assert.ok(order, 'une commande devrait exister');
  const r = await request('GET', `/suivi/${order.order_number}`);
  assert.strictEqual(r.status, 200);
  assert.ok(!r.body.includes(order.customer_name), `le nom complet ne doit pas apparaître: ${order.customer_name}`);
  assert.ok(!r.body.includes(order.customer_phone_raw), 'le téléphone ne doit pas apparaître');
  assert.match(r.body, /Commande enregistrée|nouvelle/);
  const notFound = await request('GET', '/suivi/WMS-XXXX-XXXX');
  assert.strictEqual(notFound.status, 404);
});

test('administration : protection des routes sans authentification', async () => {
  for (const p of ['/admin', '/admin/commandes', '/admin/produits', '/admin/statistiques', '/admin/scripts', '/admin/parametres', '/admin/commandes/export.csv']) {
    const r = await request('GET', p);
    assert.strictEqual(r.status, 302, `${p} devrait rediriger — obtenu ${r.status}`);
    assert.match(r.headers.location || '', /\/admin\/login/);
  }
});

let adminCookies = '';

test('connexion admin : échec → 401, succès → session', async () => {
  const pageResp = await request('GET', '/admin/login');
  assert.strictEqual(pageResp.status, 200);
  assert.match(pageResp.body, /Mot de passe/);

  const bad = await request('POST', '/admin/login', {
    form: { email: process.env.ADMIN_EMAIL, password: 'nopass1', next: '/admin' },
  });
  assert.strictEqual(bad.status, 401);

  const ok = await request('POST', '/admin/login', {
    form: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, next: '/admin' },
  });
  assert.strictEqual(ok.status, 302);
  assert.match(ok.headers.location, /\/admin/);
  adminCookies = cookieJar(ok.setCookie);
  const sess = await request('GET', '/admin/login', { cookies: adminCookies });
  adminCookies = cookieJar(sess.setCookie) || adminCookies;
  assert.ok(adminCookies.includes('wms_csrf'));
});

test('tableau de bord : compteurs + commande visible', async () => {
  const r = await request('GET', '/admin', { cookies: adminCookies });
  assert.strictEqual(r.status, 200);
  assert.match(r.body, /Tableau de bord/);
  assert.match(r.body, /WMS-\d{6}-\d{4}/);
  assert.match(r.body, /Compaore Aicha/);
});

test('gestion commande : confirmation manuelle + livraison + encaissement', async () => {
  const order = db.get('SELECT * FROM orders ORDER BY id DESC LIMIT 1');
  const csrf = adminCookies.match(/wms_csrf=([^;]+)/)[1];

  const postStatus = (to, extra = {}) => request('POST', `/admin/commandes/${order.id}/statut`, {
    cookies: adminCookies,
    form: { _csrf: csrf, to_status: to, ...extra },
  });

  // transition interdite : nouvelle → livrée
  assert.strictEqual((await postStatus('livree')).status, 400);
  // flux complet
  for (const step of ['a_confirmer', 'confirmee', 'en_preparation', 'en_livraison', 'livree']) {
    const rr = await postStatus(step, step === 'livree' ? { amount_cashed: 10000 } : {});
    assert.strictEqual(rr.status, 302, step);
  }
  const final = db.get('SELECT * FROM orders WHERE id = ?', [order.id]);
  assert.strictEqual(final.status, 'livree');
  assert.strictEqual(final.amount_cashed, 10000);
  okStock(8); // 10 - 2 livrés
  // historique visible dans la fiche
  const detail = await request('GET', `/admin/commandes/${order.id}`, { cookies: adminCookies });
  assert.match(detail.body, /Historique/);
  assert.match(detail.body, /Livrée/);
});

function okStock(expected) {
  const prod = db.get('SELECT * FROM products WHERE price_fcfa = 5000');
  assert.strictEqual(prod.stock_qty, expected);
}

test('encaissement après livraison : saisie manuelle', async () => {
  const order = db.get('SELECT * FROM orders WHERE status = \'livree\' ORDER BY id DESC LIMIT 1');
  const csrf = adminCookies.match(/wms_csrf=([^;]+)/)[1];
  const r = await request('POST', `/admin/commandes/${order.id}/encaissement`, {
    cookies: adminCookies,
    form: { _csrf: csrf, amount_cashed: 9800 },
  });
  assert.strictEqual(r.status, 302);
  assert.strictEqual(db.get('SELECT amount_cashed FROM orders WHERE id = ?', [order.id]).amount_cashed, 9800);
  const bad = await request('POST', `/admin/commandes/${order.id}/encaissement`, {
    cookies: adminCookies,
    form: { amount_cashed: 'abc' }, // sans csrf → 403
  });
  assert.strictEqual(bad.status, 403);
});

test('export CSV : authentifié + contenu', async () => {
  const r = await request('GET', '/admin/commandes/export.csv', { cookies: adminCookies });
  assert.strictEqual(r.status, 200);
  assert.match(r.headers['content-type'], /text\/csv/);
  assert.match(r.headers['content-disposition'], /attachment/);
  assert.match(r.body, /numero_commande/);
  assert.match(r.body, /Compaore Aicha/);
});

test('CRUD produit via formulaire admin', async () => {
  const csrf = adminCookies.match(/wms_csrf=([^;]+)/)[1];
  const create = await request('POST', '/admin/produits', {
    cookies: adminCookies,
    form: { _csrf: csrf, name: 'Produit HTTP Nouveau', category: 'divers', price_fcfa: 7000, stock_enabled: '1', stock_qty: 4, active: '1' },
  });
  assert.strictEqual(create.status, 302);
  const p = db.get('SELECT * FROM products WHERE name = ?', ['Produit HTTP Nouveau']);
  assert.ok(p);
  assert.strictEqual(p.price_fcfa, 7000);
  // fiche publique visible
  const shop = await request('GET', `/produit/${p.slug}`);
  assert.strictEqual(shop.status, 200);
  // modification
  const edit = await request('POST', `/admin/produits/${p.id}`, {
    cookies: adminCookies,
    form: { _csrf: csrf, name: 'Produit HTTP Nouveau v2', category: 'divers', price_fcfa: 7500, active: '1' },
  });
  assert.strictEqual(edit.status, 302);
  assert.strictEqual(db.get('SELECT price_fcfa FROM products WHERE id = ?', [p.id]).price_fcfa, 7500);
});

test('statistiques admin accessibles', async () => {
  const r = await request('GET', '/admin/statistiques', { cookies: adminCookies });
  assert.strictEqual(r.status, 200);
  assert.match(r.body, /Statistiques commerciales/);
  assert.match(r.body, /Taux de confirmation/);
  const resume = await request('GET', '/admin/statistiques/resume', { cookies: adminCookies });
  assert.strictEqual(resume.status, 200);
  assert.match(resume.body, /Résumé mensuel/);
});

test('changement de mot de passe admin', async () => {
  const csrf = adminCookies.match(/wms_csrf=([^;]+)/)[1];
  const NEW_PWD = ['Nouveau', 'MotDePasse', '5678!'].join('');
  const OLD_PWD = ['Mot', 'DePasse', 'Test1234!'].join('');
  const r = await request('POST', '/admin/parametres/mot-de-passe', {
    cookies: adminCookies,
    form: { _csrf: csrf, current_password: process.env.ADMIN_PASSWORD, new_password: NEW_PWD, confirm_password: NEW_PWD },
  });
  assert.strictEqual(r.status, 200);
  assert.match(r.body, /modifié avec succès/);
  // l'ancien mot de passe ne fonctionne plus
  const oldLogin = await request('POST', '/admin/login', {
    form: { email: process.env.ADMIN_EMAIL, password: OLD_PWD, next: '/admin' },
  });
  assert.strictEqual(oldLogin.status, 401);
  const newLogin = await request('POST', '/admin/login', {
    form: { email: process.env.ADMIN_EMAIL, password: NEW_PWD, next: '/admin' },
  });
  assert.strictEqual(newLogin.status, 302);
});

test('événements analytiques internes', async () => {
  const r = await request('POST', '/api/events', {
    body: JSON.stringify({ type: 'whatsapp_click', detail: 'test_http' }),
    headers: { 'Content-Type': 'application/json' },
  });
  assert.strictEqual(r.status, 200);
  const bad = await request('POST', '/api/events', {
    body: JSON.stringify({ type: 'type_invalide' }),
    headers: { 'Content-Type': 'application/json' },
  });
  assert.strictEqual(bad.status, 400);
  assert.ok(db.get("SELECT COUNT(*) n FROM events WHERE type = 'whatsapp_click' AND detail = 'test_http'").n >= 1);
});

test('sécurité : injection basique et headers', async () => {
  const r = await request('GET', "/produits?q=' OR '1'='1");
  assert.strictEqual(r.status, 200);
  const r2 = await request('GET', '/produit/%27%3B--');
  assert.ok([404, 400].includes(r2.status));
  const home = await request('GET', '/');
  assert.ok(home.headers['content-security-policy'], 'CSP attendu');
  const xfo = home.headers['x-frame-options'];
  assert.ok(xfo, 'X-Frame-Options attendu');
  assert.ok(home.headers['x-content-type-options'], 'nosniff attendu');
});
