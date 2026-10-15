/**
 * Tests de bout en bout : le serveur Next.js de production est réellement
 * démarré (voir tests/setup/global.ts) et interrogé en HTTP.
 *
 * Parcours couvert :
 *   visite du site public → passage d'une commande → suivi côté client →
 *   connexion administrateur → traitement de la commande (changements de
 *   statut) → export CSV → protection des accès.
 */
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const PORT = 3987;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DB_FILE = path.join(process.cwd(), 'data', 'test-e2e', 'wms.db');

const ADMIN_EMAIL = 'admin.test@wms.local';
const ADMIN_PASSWORD = 'MotDePasseTest-2026!';

/* ------------------------- utilitaires HTTP ------------------------- */

class CookieJar {
  private cookies = new Map<string, string>();

  absorb(response: Response): void {
    for (const raw of response.headers.getSetCookie()) {
      const [pair] = raw.split(';');
      const index = pair.indexOf('=');
      if (index === -1) continue;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (value === '' || /Expires=Thu, 01 Jan 1970/i.test(raw)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  header(): string {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  get(name: string): string | undefined {
    return this.cookies.get(name);
  }
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  jar?: CookieJar;
  csrf?: boolean;
  redirect?: RequestRedirect;
}

async function api(pathname: string, options: ApiOptions = {}): Promise<Response> {
  const { method = 'GET', body, jar, csrf = false, redirect = 'manual' } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (jar) {
    const cookie = jar.header();
    if (cookie) headers.Cookie = cookie;
    if (csrf) headers['x-csrf-token'] = jar.get('wms_csrf') ?? '';
  }
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect,
  });
  jar?.absorb(response);
  return response;
}

/** Identifiant d'un produit réellement présent dans le catalogue de test. */
function firstProduct(): { id: number; name: string; slug: string; priceFcfa: number | null } {
  const db = new DatabaseSync(DB_FILE);
  try {
    const row = db
      .prepare('SELECT id, name, slug, price_fcfa FROM products ORDER BY id LIMIT 1')
      .get() as { id: number; name: string; slug: string; price_fcfa: number | null } | undefined;
    if (!row) throw new Error('Aucun produit dans la base de test : le peuplement a échoué.');
    return { id: row.id, name: row.name, slug: row.slug, priceFcfa: row.price_fcfa };
  } finally {
    db.close();
  }
}

function orderPayload(productId: number, overrides: Record<string, unknown> = {}) {
  return {
    customerName: 'Awa Ouédraogo',
    phone: '+226 70 12 34 56',
    address: 'Secteur 30, près du marché',
    city: 'Ouagadougou',
    items: [{ productId, quantity: 2 }],
    paymentMethod: 'paiement_livraison',
    ...overrides,
  };
}

interface OrderResponse {
  ok: boolean;
  orderNumber: string;
  publicToken: string;
  status: string;
  pricePending: boolean;
  totalFcfa: number | null;
  message: string;
}

/* ----------------------------- tests ------------------------------- */

describe('Site public', () => {
  it('sert la page d’accueil avec la marque et le slogan', async () => {
    const response = await api('/');
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('Wendmanegda');
    expect(html).toContain('Engagés pour satisfaire');
    expect(html).toContain('wa.me/22656592557');
  });

  it('sert les pages publiques principales', async () => {
    for (const pathname of ['/boutique', '/services', '/a-propos', '/contact', '/commande', '/suivi', '/conditions', '/confidentialite']) {
      const response = await api(pathname);
      expect(response.status, `page ${pathname}`).toBe(200);
    }
  });

  it('expose un sitemap, un robots.txt et un manifeste PWA', async () => {
    const sitemap = await api('/sitemap.xml');
    expect(sitemap.status).toBe(200);
    expect(await sitemap.text()).toContain('<urlset');

    const robots = await api('/robots.txt');
    expect(robots.status).toBe(200);

    const manifest = await api('/manifest.webmanifest');
    expect(manifest.status).toBe(200);
    expect(await manifest.text()).toContain('Wendmanegda');
  });

  it('affiche une page produit sans inventer de prix', async () => {
    const product = firstProduct();
    const response = await api(`/boutique/${product.slug}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(product.name);
    if (product.priceFcfa === null) {
      expect(html).toContain('confirmer');
      expect(html).not.toMatch(/\d[\d\s]+FCFA/);
    }
  });

  it('accepte un événement d’audience et refuse un type inconnu', async () => {
    const ok = await api('/api/analytics/track', {
      method: 'POST',
      body: { type: 'page_view', path: '/boutique' },
    });
    expect(ok.status).toBe(200);

    const refused = await api('/api/analytics/track', { method: 'POST', body: { type: 'piratage' } });
    expect(refused.status).toBe(400);
  });
});

describe('Sécurité de l’espace administration', () => {
  it('redirige une page d’administration sans session, sans boucle de redirection', async () => {
    const protectedPage = await api('/admin');
    expect([302, 307, 308]).toContain(protectedPage.status);
    const location = protectedPage.headers.get('location') ?? '';
    expect(location).toContain('/admin/connexion');

    const loginPage = await api('/admin/connexion');
    expect(loginPage.status).toBe(200);
    expect(await loginPage.text()).toContain('Connexion');
  });

  it('refuse l’accès à l’API d’administration sans session (401)', async () => {
    expect((await api('/api/admin/orders')).status).toBe(401);
    expect((await api('/api/admin/orders/export')).status).toBe(401);
    expect((await api('/api/admin/stats')).status).toBe(401);
    expect((await api('/api/admin/products')).status).toBe(401);
    expect(
      (await api('/api/admin/orders/1/status', { method: 'POST', body: { status: 'livree' } })).status,
    ).toBe(401);
  });

  it('refuse un mot de passe incorrect et laisse une trace', async () => {
    const response = await api('/api/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: 'MauvaisMotDePasse-123' },
    });
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe('Identifiants incorrects.');
  });

  it('refuse une adresse e-mail invalide', async () => {
    const response = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'pas-un-email', password: 'MotDePasseTest-2026!' },
    });
    expect(response.status).toBe(400);
  });
});

describe('Parcours commande → traitement → livraison', () => {
  const jar = new CookieJar();
  let orderNumber = '';
  let publicToken = '';
  let orderId = 0;

  it('crée une commande avec un numéro et un jeton de suivi', async () => {
    const product = firstProduct();
    const response = await api('/api/orders', { method: 'POST', body: orderPayload(product.id) });
    expect(response.status).toBe(201);
    const data = (await response.json()) as OrderResponse;

    expect(data.ok).toBe(true);
    expect(data.orderNumber).toMatch(/^WMS-\d{8}-\d{5}$/);
    expect(data.status).toBe('nouvelle');
    expect(data.publicToken).toMatch(/^[a-f0-9]{32,}$/);
    // Le produit de test n'a pas de prix officiel : le total doit rester nul.
    expect(data.pricePending).toBe(true);
    expect(data.totalFcfa).toBeNull();

    orderNumber = data.orderNumber;
    publicToken = data.publicToken;

    // Vérification directe en base : le jeton n'est jamais stocké en clair.
    const db = new DatabaseSync(DB_FILE);
    try {
      const row = db
        .prepare('SELECT id, public_token, price_pending, total_fcfa FROM orders WHERE order_number = ?')
        .get(orderNumber) as
        | { id: number; public_token: string; price_pending: number; total_fcfa: number | null }
        | undefined;
      expect(row).toBeDefined();
      orderId = row!.id;
      expect(row!.public_token).not.toBe(publicToken);
      expect(row!.public_token).toMatch(/^[a-f0-9]{64}$/);
      expect(row!.price_pending).toBe(1);
      expect(row!.total_fcfa).toBeNull();
    } finally {
      db.close();
    }
  });

  it('refuse une commande piégée (honeypot) et une commande sans article', async () => {
    const product = firstProduct();

    const bot = await api('/api/orders', {
      method: 'POST',
      body: orderPayload(product.id, { website: 'http://spam.example' }),
    });
    expect(bot.status).toBe(400);

    const empty = await api('/api/orders', {
      method: 'POST',
      body: orderPayload(product.id, { items: [] }),
    });
    expect(empty.status).toBe(400);
  });

  it('refuse le suivi sans preuve d’identité et l’autorise avec le téléphone ou le jeton', async () => {
    const denied = await api(`/api/orders/track?number=${orderNumber}&phone=+226 71 99 99 99`);
    expect(denied.status).toBe(403);

    const byPhone = await api(`/api/orders/track?number=${orderNumber}&phone=3456`);
    expect(byPhone.status).toBe(200);
    const phoneData = await byPhone.json();
    expect(phoneData.status).toBe('nouvelle');
    expect(phoneData.totalFcfa).toBeNull();
    expect(phoneData.pricePending).toBe(true);

    const byToken = await api(`/api/orders/track?number=${orderNumber}&token=${publicToken}`);
    expect(byToken.status).toBe(200);

    const unknown = await api('/api/orders/track?number=WMS-19700101-00001&token=inexistant');
    expect(unknown.status).toBe(404);
  });

  it('affiche la page de confirmation avec un lien WhatsApp honnête', async () => {
    const response = await api(`/commande/${orderNumber}?token=${publicToken}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(orderNumber);
    expect(html).toContain('wa.me/22656592557');
    expect(html).toContain('confirmée automatiquement');
  });

  it('connecte l’administrateur et initialise le jeton anti-CSRF', async () => {
    const response = await api('/api/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      jar,
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(jar.get('wms_session')).toBeTruthy();
    expect(jar.get('wms_csrf')).toBeTruthy();

    const session = await api('/api/auth/session', { jar });
    expect((await session.json()).authenticated).toBe(true);

    const dashboard = await api('/admin', { jar });
    expect(dashboard.status).toBe(200);
    expect(await dashboard.text()).toContain('Tableau de bord');
  });

  it('affiche toutes les pages d’administration sans erreur de rendu', async () => {
    const pages: [string, string][] = [
      ['/admin', 'Tableau de bord'],
      ['/admin/commandes', 'Commandes'],
      ['/admin/produits', 'Produits'],
      ['/admin/statistiques', 'Statistiques'],
      ['/admin/scripts', 'Scripts'],
      ['/admin/campagnes', 'Campagnes'],
      ['/admin/recherche', 'Recherche'],
      ['/admin/trafic', 'Trafic'],
      ['/admin/parametres', 'Paramètres'],
    ];
    for (const [pathname, expected] of pages) {
      const response = await api(pathname, { jar });
      expect(response.status, `page ${pathname}`).toBe(200);
      const html = await response.text();
      expect(html, `contenu de ${pathname}`).toContain(expected);
    }
  });

  it('rejette une mutation sans jeton anti-CSRF', async () => {
    const response = await api(`/api/admin/orders/${orderId}/status`, {
      method: 'POST',
      body: { status: 'a_confirmer' },
      jar,
      csrf: false,
    });
    expect(response.status).toBe(403);
  });

  it('retrouve la commande dans la liste et refuse les transitions impossibles', async () => {
    const list = await api(`/api/admin/orders?search=${orderNumber}`, { jar });
    expect(list.status).toBe(200);
    const data = await list.json();
    expect(data.total).toBeGreaterThanOrEqual(1);
    const found = data.orders.find((order: { orderNumber: string }) => order.orderNumber === orderNumber);
    expect(found).toBeDefined();
    expect(found.customerName).toBe('Awa Ouédraogo');
    expect(found.pricePending).toBe(true);

    const jump = await api(`/api/admin/orders/${orderId}/status`, {
      method: 'POST',
      body: { status: 'livree' },
      jar,
      csrf: true,
    });
    expect(jump.status).toBe(400);
    expect((await jump.json()).error).toMatch(/transition/i);
  });

  it('fait évoluer le statut étape par étape jusqu’à la livraison', async () => {
    const steps = ['a_confirmer', 'confirmee', 'en_preparation', 'en_livraison', 'livree'];
    for (const status of steps) {
      const response = await api(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        body: {
          status,
          note: `Étape ${status} (test automatisé)`,
          amountPaidFcfa: status === 'livree' ? 15000 : undefined,
          trackingCode: status === 'en_livraison' ? 'LIV-2026-001' : undefined,
        },
        jar,
        csrf: true,
      });
      expect(response.status, `transition vers ${status}`).toBe(200);
      expect((await response.json()).order.status).toBe(status);
    }

    const order = await api(`/api/admin/orders/${orderId}`, { jar });
    const detail = await order.json();
    expect(detail.order.status).toBe('livree');
    expect(detail.order.amount_paid_fcfa).toBe(15000);
    // Le statut « livrée » est daté (les montants livrés sont suivis séparément).
    expect(detail.order.delivered_at).toBeTruthy();
    expect(detail.events.length).toBeGreaterThanOrEqual(6);
  });

  it('n’autorise plus aucune transition depuis un état final', async () => {
    const response = await api(`/api/admin/orders/${orderId}/status`, {
      method: 'POST',
      body: { status: 'nouvelle' },
      jar,
      csrf: true,
    });
    expect(response.status).toBe(400);
  });

  it('répercute la livraison dans le suivi public', async () => {
    const response = await api(`/api/orders/track?number=${orderNumber}&phone=3456`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('livree');
    expect(data.statusLabel).toBe('Livrée');
    expect(data.deliveredAt).toBeTruthy();
  });

  it('exporte les commandes en CSV (administrateur uniquement)', async () => {
    const response = await api('/api/admin/orders/export', { jar });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('content-disposition')).toContain('wms-commandes-');

    const csv = await response.text();
    expect(csv).toContain('numero;date;statut');
    expect(csv).toContain(orderNumber);
    expect(csv).toContain('Livrée');
    expect(csv).toContain('Awa Ouédraogo');
  });

  it('sert les statistiques consolidées sans mélanger les montants', async () => {
    const response = await api('/api/admin/stats', { jar });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.current.total).toBeGreaterThanOrEqual(1);
    expect(data.current.delivered).toBe(1);
    // 15 000 FCFA réellement encaissés ; la valeur « commandée » reste à 0
    // car le prix de cet article n'était pas fixé (prix à confirmer).
    expect(data.current.collected).toBe(15000);
    expect(data.current.orderValue).toBe(0);
    expect(data.current.pending).toBe(0);
  });

  it('protège les pages d’administration après déconnexion', async () => {
    const logout = await api('/api/auth/logout', { method: 'POST', jar, csrf: true });
    expect(logout.status).toBe(200);

    const session = await api('/api/auth/session', { jar });
    expect((await session.json()).authenticated).toBe(false);

    const afterLogout = await api('/api/admin/orders', { jar });
    expect(afterLogout.status).toBe(401);
  });
});

describe('Suivi public de secours', () => {
  it('la page /suivi permet de saisir un numéro de commande', async () => {
    const response = await api('/suivi');
    const html = await response.text();
    expect(html).toContain('Suivi');
    expect(html.toLowerCase()).toContain('numéro de commande');
  });
});
