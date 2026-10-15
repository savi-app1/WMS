'use strict';
/* Tests — scripts, campagnes, CSV, WhatsApp, statistiques, paramètres. */
process.env.DATABASE_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret-' + 'd'.repeat(32);
process.env.NODE_ENV = 'test';
process.env.WHATSAPP_NUMBER = '22656592557';

const { test, before } = require('node:test');
const assert = require('node:assert');
const db = require('../src/db');
const scripts = require('../src/services/scripts');
const csv = require('../src/services/csv');
const whatsapp = require('../src/services/whatsapp');
const stats = require('../src/services/stats');
const settings = require('../src/services/settings');
const orders = require('../src/services/orders');
const products = require('../src/services/products');

before(() => {
  db.open(':memory:');
  db.run("INSERT INTO categories (slug, name) VALUES ('divers', 'Divers')");
});

test('scripts : créer, modifier, dupliquer, supprimer', () => {
  const c = scripts.createScript({ title: 'Script pub test', type: 'script_video', content: 'Intro : ...' });
  assert.strictEqual(c.ok, true);
  assert.strictEqual(scripts.getScript(c.id).status, 'brouillon');

  assert.strictEqual(scripts.updateScript(c.id, { title: 'Script pub test v2', type: 'publication', content: 'Nouveau', status: 'valide' }).ok, true);
  const s = scripts.getScript(c.id);
  assert.strictEqual(s.title, 'Script pub test v2');
  assert.strictEqual(s.status, 'valide');

  const dup = scripts.duplicateScript(c.id);
  assert.strictEqual(dup.ok, true);
  const dupRow = scripts.getScript(dup.id);
  assert.match(dupRow.title, /^\(copie\) /);
  assert.strictEqual(dupRow.status, 'brouillon');

  assert.strictEqual(scripts.deleteScript(dup.id).ok, true);
  assert.strictEqual(scripts.getScript(dup.id), null);

  // recherche
  scripts.createScript({ title: 'Dialogue fournisseur ChineAudio', type: 'dialogue', tags: 'fournisseur' });
  assert.ok(scripts.listScripts({ q: 'Dialogue' }).length >= 1);
  // type inconnu → filtre ignoré (ne doit pas planter, renvoie tout)
  assert.ok(scripts.listScripts({ type: 'playbill' }).length >= 1);
});

test('campagnes : CRUD + budget', () => {
  const c = scripts.createCampaign({ name: 'Campagne Test', budget_fcfa: 15000, platform: 'Facebook Ads', utm_string: 'utm_source=fb' });
  assert.strictEqual(c.ok, true);
  assert.strictEqual(scripts.getCampaign(c.id).budget_fcfa, 15000);
  assert.strictEqual(scripts.createCampaign({ name: 'Bad', budget_fcfa: -10 }).ok, false);
  assert.strictEqual(scripts.updateCampaign(c.id, { name: 'Campagne Test v2', status: 'pret' }).ok, true);
  assert.strictEqual(scripts.getCampaign(c.id).status, 'pret');
  assert.ok(scripts.listCampaigns({ status: 'pret' }).length >= 1);
  assert.strictEqual(scripts.deleteCampaign(c.id).ok, true);
});

test('export CSV commandes : échappement complet', () => {
  assert.strictEqual(csv.csvEscape('vrai, avec virgule'), '"vrai, avec virgule"');
  assert.strictEqual(csv.csvEscape('guillemets " ici'), '"guillemets "" ici"');
  assert.strictEqual(csv.csvEscape(null), '');
  assert.strictEqual(csv.csvEscape(500), '500');

  // données
  const r = products.createProduct({ name: 'Produit CSV', category: 'divers', price_fcfa: 3200 });
  const o = orders.createOrder({
    customerName: 'Nom, avec virgule', customerPhone: '70112233',
    customerAddress: 'Adresse "sépciale" quartier', items: [{ productId: r.id, quantity: 1 }],
  });
  assert.strictEqual(o.ok, true);
  const content = csv.ordersCsv({ demo: 'all' });
  assert.ok(content.startsWith('\uFEFF')); // BOM pour Excel
  assert.match(content, /numero_commande/);
  assert.match(content, /"Nom, avec virgule"/);
  assert.match(content, /Adresse ""sépciale"" quartier/);
});

test('liens WhatsApp : format wa.me + message prérempli', () => {
  const l1 = whatsapp.linkToWms({ productName: 'Casque X', productUrl: 'https://wms.example/produit/casque-x' });
  assert.match(l1, /^https:\/\/wa\.me\/22656592557\?text=/);
  assert.ok(decodeURIComponent(l1).includes('Casque X'));
  assert.ok(decodeURIComponent(l1).includes('https://wms.example/produit/casque-x'));

  const l2 = whatsapp.linkToWms({});
  assert.ok(decodeURIComponent(l2).includes('informations'));

  const l3 = whatsapp.linkToCustomer({ customer_name: 'Awa', customer_phone: '22670001317', order_number: 'WMS-X' });
  assert.ok(l3.startsWith('https://wa.me/22670001317?text='));
  assert.ok(decodeURIComponent(l3).includes('WMS-X'));
});

test('statistiques : séparation commandé / confirmé / livré / encaissé', () => {
  settings.setDeliveryZones({});
  const r = products.createProduct({ name: 'Prod Stats', category: 'divers', price_fcfa: 10000 });
  const mk = () => orders.createOrder({
    customerName: 'Stat Client', customerPhone: '70112233',
    customerAddress: 'Adresse valide quartier', items: [{ productId: r.id, quantity: 1 }],
  });
  // présence possible d'autres commandes créées par les tests précédents : on mesure les deltas
  const before_ = stats.monthlyStats({ demo: 'all' }).totals;
  const o1 = mk();
  const o2 = mk();
  const o3 = mk();
  orders.changeStatus(o2.orderId, 'confirmee', { amountOverride: 10500 });
  orders.changeStatus(o3.orderId, 'confirmee', {});
  orders.changeStatus(o3.orderId, 'en_livraison', {});
  orders.changeStatus(o3.orderId, 'livree', {});
  orders.setAmountCashed(o3.orderId, 9800, 'admin');

  const s = stats.monthlyStats({ demo: 'all' });
  assert.strictEqual(s.totals.orders_count, (before_.orders_count || 0) + 3);
  assert.strictEqual(s.totals.confirmed_count, (before_.confirmed_count || 0) + 2);
  assert.strictEqual(s.totals.delivered_count, (before_.delivered_count || 0) + 1);
  assert.strictEqual(s.totals.amount_cashed, (before_.amount_cashed || 0) + 9800);
  // top produits
  assert.ok(s.topProducts.some((p) => p.product_name === 'Prod Stats'));
  // par jour
  assert.ok(s.byDay.length >= 1);
});

test('événements internes : enregistrement + résumé trafic', () => {
  stats.trackEvent({ type: 'product_view', path: '/produit/x', productId: 1, detail: 'd' });
  stats.trackEvent({ type: 'whatsapp_click', detail: 'bouton' });
  stats.trackEvent({ type: 'page_view', utm: { utm_source: 'facebook', utm_medium: 'paid', utm_campaign: 'c1' } });
  const sum = stats.trafficSummary(30);
  assert.strictEqual(sum.byType.product_view, 1);
  assert.strictEqual(sum.byType.whatsapp_click, 1);
  assert.ok(sum.byUtm.some((u) => u.utm_source === 'facebook'));
});

test('paramètres : zones de livraison', () => {
  settings.setDeliveryZones({ 'Centre': 300 });
  assert.deepStrictEqual(settings.getDeliveryZones(), { Centre: 300 });
  settings.setDeliveryZones({});
  assert.deepStrictEqual(settings.getDeliveryZones(), {});
});

test('résumé mensuel textuel', () => {
  const report = stats.monthlySummaryReport();
  assert.ok(typeof report.period === 'string' && report.period.length > 0);
  assert.ok(report.orders >= 3);
});
