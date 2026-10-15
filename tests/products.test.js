'use strict';
/* Tests — produits, slugs, prix, visibilité. */
process.env.DATABASE_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret-' + 'c'.repeat(32);
process.env.NODE_ENV = 'test';

const { test, before } = require('node:test');
const assert = require('node:assert');
const db = require('../src/db');
const products = require('../src/services/products');
const orders = require('../src/services/orders');

before(() => {
  db.open(':memory:');
  db.run("INSERT INTO categories (slug, name) VALUES ('smartphones-accessoires', 'Smartphones'), ('autres', 'Autres')");
});

test('création : validations de base', () => {
  assert.strictEqual(products.createProduct({ name: 'A', category: 'autres' }).ok, false);
  assert.strictEqual(products.createProduct({ name: 'Valide Produit', category: 'inconnue' }).ok, false);
  assert.strictEqual(products.createProduct({ name: 'Valide Produit', category: 'autres', price_fcfa: 'abc' }).ok, false);
  assert.strictEqual(products.createProduct({ name: 'Valide Produit', category: 'autres', price_fcfa: -5 }).ok, false);
  const ok = products.createProduct({ name: 'Valide Produit', category: 'autres', price_fcfa: 2500 });
  assert.strictEqual(ok.ok, true);
});

test('prix vide = « à confirmer » (NULL, jamais 0)', () => {
  const r = products.createProduct({ name: 'Service Sur Mesure', category: 'autres', price_fcfa: '' });
  const p = products.getProduct(r.id);
  assert.strictEqual(p.price_fcfa, null);
});

test('slugs propres et uniques', () => {
  assert.strictEqual(products.slugify('Écouteurs Bluetooth Pro 2!'), 'ecouteurs-bluetooth-pro-2');
  const a = products.createProduct({ name: 'Tripod stable', category: 'autres' });
  const b = products.createProduct({ name: 'Tripod stable', category: 'autres' });
  assert.notStrictEqual(a.slug, b.slug);
});

test('mise à jour produit', () => {
  const r = products.createProduct({ name: 'Chargeur 45W', category: 'autres', price_fcfa: 2000 });
  const up = products.updateProduct(r.id, { name: 'Chargeur 60W', category: 'autres', price_fcfa: 3500, stock_enabled: '1', stock_qty: 7, active: '1' });
  assert.strictEqual(up.ok, true);
  const p = products.getProduct(r.id);
  assert.strictEqual(p.name, 'Chargeur 60W');
  assert.strictEqual(p.price_fcfa, 3500);
  assert.strictEqual(p.stock_enabled, 1);
  assert.strictEqual(p.stock_qty, 7);
});

test('suppression : désactivation si le produit a déjà été commandé', () => {
  const r = products.createProduct({ name: 'Produit Commandé', category: 'autres', price_fcfa: 1000, stock_enabled: 0 });
  const o = orders.createOrder({
    customerName: 'Test Client', customerPhone: '70112233',
    customerAddress: 'Adresse valide quartier', items: [{ productId: r.id, quantity: 1 }],
  });
  assert.strictEqual(o.ok, true);
  const del = products.deleteProduct(r.id);
  assert.strictEqual(del.ok, true);
  assert.strictEqual(del.deactivated, true);
  const p = products.getProduct(r.id);
  assert.strictEqual(p.active, 0);
  // l'historique de commande conserve le nom
  const order = orders.getOrder(o.orderId);
  assert.strictEqual(order.items[0].product_name, 'Produit Commandé');
});

test('suppression réelle si jamais commandé', () => {
  const r = products.createProduct({ name: 'Produit Isolé', category: 'autres' });
  const del = products.deleteProduct(r.id);
  assert.strictEqual(del.ok, true);
  assert.strictEqual(del.deactivated, undefined);
  assert.strictEqual(products.getProduct(r.id), null);
});

test('recherche et filtres catalogue', () => {
  products.createProduct({ name: 'iPhone 15 Pro (recherche)', category: 'smartphones-accessoires', price_fcfa: 3000, active: '1' });
  products.createProduct({ name: 'Masqué Produit', category: 'autres', price_fcfa: 100, active: '0' });
  const found = products.listProducts({ q: 'iphone' });
  assert.ok(found.some((p) => p.name.includes('iPhone')));
  const publicList = products.listProducts({});
  assert.ok(!publicList.some((p) => p.name === 'Masqué Produit'));
  const adminList = products.listProducts({ includeInactive: true });
  assert.ok(adminList.some((p) => p.name === 'Masqué Produit'));
  const byCat = products.listProducts({ category: 'smartphones-accessoires' });
  assert.ok(byCat.every((p) => p.category === 'smartphones-accessoires'));
});
