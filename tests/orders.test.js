'use strict';
/* Tests — cycle de vie des commandes : règles métier critiques. */
process.env.DATABASE_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret-' + 'b'.repeat(32);
process.env.NODE_ENV = 'test';

const { test, before } = require('node:test');
const assert = require('node:assert');
const db = require('../src/db');
const orders = require('../src/services/orders');
const products = require('../src/services/products');
const settings = require('../src/services/settings');

let productPriced; // 5 000 FCFA, stock 10
let productFree;   // prix à confirmer (NULL)

before(() => {
  db.open(':memory:');
  db.run("INSERT INTO categories (slug, name) VALUES ('audio-bluetooth', 'Audio'), ('divers', 'Divers')");
  const r1 = products.createProduct({ name: 'Écouteurs Test', category: 'audio-bluetooth', price_fcfa: 5000, stock_enabled: '1', stock_qty: 10 });
  const r2 = products.createProduct({ name: 'Service Test Sans Prix', category: 'divers', price_fcfa: '' });
  productPriced = db.get('SELECT * FROM products WHERE id = ?', [r1.id]);
  productFree = db.get('SELECT * FROM products WHERE id = ?', [r2.id]);
});

function validInput(over = {}) {
  return {
    customerName: 'Issouf Kinda',
    customerPhone: '+226 70 11 22 33',
    customerAddress: 'Secteur 12, rue 45.67',
    customerZone: 'Tampouy',
    customerNotes: '',
    items: [{ productId: productPriced.id, quantity: 2 }],
    ...over,
  };
}

test('création de commande valide : statut nouvelle, jamais confirmée automatiquement', () => {
  const r = orders.createOrder(validInput());
  assert.strictEqual(r.ok, true);
  const order = db.get('SELECT * FROM orders WHERE id = ?', [r.orderId]);
  assert.strictEqual(order.status, 'nouvelle');
  assert.strictEqual(order.confirmed_at, null);
  assert.strictEqual(order.amount_confirmed, null);
  assert.match(order.order_number, /^WMS-\d{6}-\d{4}$/);
  // numéro UNIQUE (pas de doublon)
  const dup = orders.createOrder(validInput());
  assert.notStrictEqual(dup.orderNumber, order.order_number);
});

test('montants calculés UNIQUEMENT à partir des prix serveur', () => {
  // Le client ne peut PAS imposer son propre prix
  settings.setDeliveryZones({ Tampouy: 400 });
  const r = orders.createOrder(validInput({ items: [{ productId: productPriced.id, quantity: 3, unitPrice: 1 }] }));
  assert.strictEqual(r.ok, true);
  const order = db.get('SELECT * FROM orders WHERE id = ?', [r.orderId]);
  // 3 × 5 000 + 400 de livraison = 15 400
  assert.strictEqual(order.amount_ordered, 15400);
  const item = db.get('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  assert.strictEqual(item.unit_price_fcfa, 5000);
  assert.strictEqual(item.line_total, 15000);
  settings.setDeliveryZones({});
});

test('produit sans prix : montant « à confirmer », jamais inventé', () => {
  const r = orders.createOrder(validInput({ items: [{ productId: productFree.id, quantity: 1 }] }));
  assert.strictEqual(r.ok, true);
  const order = db.get('SELECT * FROM orders WHERE id = ?', [r.orderId]);
  assert.strictEqual(order.prices_incomplete, 1);
  assert.strictEqual(order.amount_ordered, null);
});

test('validations : téléphone, nom, adresse, quantité, stock', () => {
  assert.strictEqual(orders.createOrder(validInput({ customerPhone: 'abc' })).ok, false);
  assert.strictEqual(orders.createOrder(validInput({ customerName: 'K' })).ok, false);
  assert.strictEqual(orders.createOrder(validInput({ customerAddress: 'ok' })).ok, false);
  assert.strictEqual(orders.createOrder(validInput({ items: [{ productId: productPriced.id, quantity: 0 }] })).ok, false);
  assert.strictEqual(orders.createOrder(validInput({ items: [{ productId: productPriced.id, quantity: 101 }] })).ok, false);
  assert.strictEqual(orders.createOrder(validInput({ items: [] })).ok, false);
  assert.strictEqual(orders.createOrder(validInput({ items: [{ productId: 9999, quantity: 1 }] })).ok, false);
  // stock : plus que les 10 disponibles
  const tooMuch = orders.createOrder(validInput({ items: [{ productId: productPriced.id, quantity: 20 }] }));
  assert.strictEqual(tooMuch.ok, false);
  assert.match(tooMuch.errors.join(' '), /Stock insuffisant/);
});

test('cycle de vie complet : tous les statuts obligatoires', () => {
  settings.setDeliveryZones({ Tampouy: 500 });
  const r = orders.createOrder(validInput({ items: [{ productId: productPriced.id, quantity: 2 }] }));
  const id = r.orderId;

  // transition interdite : nouvelle → livrée directement
  assert.strictEqual(orders.changeStatus(id, 'livree', {}).ok, false);
  // statut inconnu
  assert.strictEqual(orders.changeStatus(id, 'bidon', {}).ok, false);

  // nouvelle → à confirmer → confirmée → préparation → livraison → livrée
  assert.strictEqual(orders.changeStatus(id, 'a_confirmer', {}).ok, true);
  assert.strictEqual(db.get('SELECT status FROM orders WHERE id = ?', [id]).status, 'a_confirmer');

  const conf = orders.changeStatus(id, 'confirmee', {});
  assert.strictEqual(conf.ok, true);
  let order = db.get('SELECT * FROM orders WHERE id = ?', [id]);
  assert.ok(order.confirmed_at);
  assert.strictEqual(order.amount_confirmed, 10500); // confirmé = montant commandé complet

  assert.strictEqual(orders.changeStatus(id, 'en_preparation', {}).ok, true);
  assert.strictEqual(orders.changeStatus(id, 'en_livraison', { note: 'Départ moto' }).ok, true);

  const livraison = orders.changeStatus(id, 'livree', {});
  assert.strictEqual(livraison.ok, true);
  order = db.get('SELECT * FROM orders WHERE id = ?', [id]);
  assert.strictEqual(order.amount_delivered, 10500);
  // livraison ≠ paiement : encaissé reste NULL
  assert.strictEqual(order.amount_cashed, null);

  // stock décrémenté à la livraison : 10 - 2 = 8
  assert.strictEqual(db.get('SELECT stock_qty FROM products WHERE id = ?', [productPriced.id]).stock_qty, 8);

  // encaissement manuel
  assert.strictEqual(orders.setAmountCashed(id, 10500, 'admin@test').ok, true);
  assert.strictEqual(db.get('SELECT amount_cashed FROM orders WHERE id = ?', [id]).amount_cashed, 10500);

  // une livrée : aucune transition possible
  assert.strictEqual(orders.changeStatus(id, 'annulee', {}).ok, false);
  assert.strictEqual(orders.changeStatus(id, 'nouvelle', {}).ok, false);

  // historique complet
  const h = db.all('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY id', [id]);
  assert.strictEqual(h.length, 6);
  assert.strictEqual(h[0].to_status, 'nouvelle');
  assert.strictEqual(h[5].to_status, 'livree');
  assert.ok(h.some((x) => x.note === 'Départ moto'));
});

test('annulation : possible avant livraison, historique conservé', () => {
  const r = orders.createOrder(validInput());
  assert.strictEqual(orders.changeStatus(r.orderId, 'annulee', { note: 'Client injoignable' }).ok, true);
  const order = db.get('SELECT * FROM orders WHERE id = ?', [r.orderId]);
  assert.strictEqual(order.status, 'annulee');
  assert.ok(order.cancelled_at);
  // l'annulation ne touche ni confirmer ni livrer
  assert.strictEqual(order.amount_confirmed, null);
  assert.strictEqual(order.amount_delivered, null);
});

test('les 7 statuts obligatoires existent', () => {
  for (const s of ['nouvelle', 'a_confirmer', 'confirmee', 'en_preparation', 'en_livraison', 'livree', 'annulee']) {
    assert.ok(orders.STATUSES.includes(s), `statut manquant: ${s}`);
  }
});

test('liste + filtres + recherche', () => {
  const all = orders.listOrders({ perPage: 100 });
  assert.ok(all.total >= 5);
  const delivered = orders.listOrders({ status: 'livree' });
  assert.ok(delivered.rows.every((o) => o.status === 'livree'));
  const search = orders.listOrders({ q: 'Kinda', perPage: 100 });
  assert.ok(search.total >= 1);
  const byNumber = orders.listOrders({ q: 'WMS-', perPage: 100 });
  assert.ok(byNumber.total >= 1);
  // données de test exclues par défaut, visibles sur demande
  db.run('INSERT INTO orders (order_number, customer_name, customer_phone, customer_phone_raw, customer_address, is_demo) VALUES (\'DEMO-T\', \'Test\', \'226\', \'226\', \'TEST\', 1)');
  assert.ok(!orders.listOrders({ perPage: 200, demo: 'hide' }).rows.some((o) => o.is_demo));
  assert.ok(orders.listOrders({ perPage: 200, demo: 'all' }).rows.some((o) => o.is_demo));
});

test('rappels internes : commandes non traitées depuis +24h', () => {
  const r = orders.createOrder(validInput());
  db.run("UPDATE orders SET created_at = datetime('now', '-25 hours') WHERE id = ?", [r.orderId]);
  const stale = orders.staleOrders(24);
  assert.ok(stale.some((o) => o.id === r.orderId));
});

test('alertes de stock faible', () => {
  db.run('UPDATE products SET stock_qty = 2 WHERE id = ?', [productPriced.id]);
  const low = orders.lowStockProducts(3);
  assert.ok(low.some((p) => p.id === productPriced.id));
});

test('compteurs par statut', () => {
  const counts = orders.statusCounts({ demo: 'all' });
  assert.ok(counts.total >= 6);
  assert.ok(counts.livree >= 1);
  assert.ok(counts.annulee >= 1);
  assert.ok(counts.nouvelles >= 0);
});
