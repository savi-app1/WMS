'use strict';
/**
 * Données de TEST clairement identifiées (is_demo = 1).
 * Usage : node scripts/seed.js
 * Ne JAMAIS exécuter en production avec des commandes réelles — utiliser
 * Administration > Paramètres > Purger pour les retirer.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const db = require('../src/db');
const { ensureAdmin } = require('../src/bootstrap');
const security = require('../src/security');

db.open();
ensureAdmin();

const PRODUCTS = [
  { slug: 'demo-ecouteurs-bluetooth', name: '[DÉMO] Écouteurs Bluetooth sans fil', category: 'audio-bluetooth', short_description: 'Réduction de bruit, autonomie longue durée.', price_fcfa: 6500, stock_enabled: 1, stock_qty: 12 },
  { slug: 'demo-montre-connectee', name: '[DÉMO] Montre connectée Smart Watch', category: 'montres-connectees', short_description: 'Écran tactile, suivi santé, notifications.', price_fcfa: 8500, stock_enabled: 1, stock_qty: 6 },
  { slug: 'demo-chargeur-rapide', name: '[DÉMO] Chargeur rapide USB-C 25W', category: 'energie', short_description: 'Compatible Android, charge rapide.', price_fcfa: 3000, stock_enabled: 1, stock_qty: 25 },
  { slug: 'demo-cle-usb-32g', name: '[DÉMO] Clé USB 32 Go', category: 'stockage', short_description: 'USB 3.0, coque métal.', price_fcfa: 2500, stock_enabled: 1, stock_qty: 30 },
  { slug: 'demo-ebook-ecommerce', name: '[DÉMO] PDF « Lancer son e-commerce »', category: 'numerique-pdf', short_description: 'Guide numérique téléchargeable.', price_fcfa: 2000, stock_enabled: 0, stock_qty: null },
  { slug: 'demo-logo-carte-visite', name: '[DÉMO] Création logo + carte de visite', category: 'formations', short_description: 'Service graphique professionnel.', price_fcfa: null, stock_enabled: 0, stock_qty: null },
];

db.transaction(() => {
  for (const p of PRODUCTS) {
    db.run(
      `INSERT INTO products (slug, name, category, short_description, description, characteristics,
         price_fcfa, stock_enabled, stock_qty, image_url, active, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 1)
       ON CONFLICT(slug) DO UPDATE SET
         price_fcfa = excluded.price_fcfa, stock_qty = excluded.stock_qty,
         stock_enabled = excluded.stock_enabled, is_demo = 1, active = excluded.active`,
      [p.slug, p.name, p.category, p.short_description,
        'Produit de démonstration. Informations et prix fictifs à remplacer par les vraies données WMS.',
        'État : Neuf | Garantie : à vérifier | Caractéristiques : à compléter',
        p.price_fcfa, p.stock_enabled, p.stock_qty]
    );
  }
});

const DEMO_ORDERS = [
  { suffix: '001', name: 'Client Test Un', phone: '+226 55 00 00 01', address: 'Ouaga 2000 (TEST)', status: 'confirmee', qty: 2, productSlug: 'demo-ecouteurs-bluetooth' },
  { suffix: '002', name: 'Client Test Deux', phone: '+226 55 00 00 02', address: 'Tampouy (TEST)', status: 'nouvelle', qty: 1, productSlug: 'demo-montre-connectee' },
  { suffix: '003', name: 'Client Test Trois', phone: '+226 55 00 00 03', address: 'Dassasgho (TEST)', status: 'livree', qty: 3, productSlug: 'demo-chargeur-rapide' },
  { suffix: '004', name: 'Client Test Quatre', phone: '+226 55 00 00 04', address: 'Pissy (TEST)', status: 'annulee', qty: 1, productSlug: 'demo-cle-usb-32g' },
  { suffix: '005', name: 'Client Test Cinq', phone: '+226 55 00 00 05', address: 'Zogona (TEST)', status: 'en_livraison', qty: 1, productSlug: 'demo-ebook-ecommerce' },
];

db.transaction(() => {
  for (const d of DEMO_ORDERS) {
    const existing = db.get('SELECT id FROM orders WHERE order_number = ?', [`DEMO-${d.suffix}`]);
    if (existing) continue;
    const product = db.get('SELECT * FROM products WHERE slug = ?', [d.productSlug]);
    const info = db.run(
      `INSERT INTO orders (order_number, customer_name, customer_phone, customer_phone_raw,
         customer_address, status, payment_method, amount_ordered, amount_confirmed,
         amount_delivered, amount_cashed, prices_incomplete, is_demo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'livraison', ?, ?, ?, ?, 0, 1,
         datetime('now', '-' || (abs(random()) % 12) || ' days'))`,
      [
        `DEMO-${d.suffix}`, d.name, security.normalizePhone(d.phone), d.phone, d.address,
        d.status,
        product.price_fcfa ? product.price_fcfa * d.qty : null,
        d.status !== 'nouvelle' && product.price_fcfa ? product.price_fcfa * d.qty : null,
        d.status === 'livree' && product.price_fcfa ? product.price_fcfa * d.qty : null,
        d.status === 'livree' && product.price_fcfa ? product.price_fcfa * d.qty : null,
      ]
    );
    db.run(
      `INSERT INTO order_items (order_id, product_id, product_name, unit_price_fcfa, quantity, line_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Number(info.lastInsertRowid), product.id, product.name, product.price_fcfa, d.qty,
        product.price_fcfa ? product.price_fcfa * d.qty : null]
    );
    db.run(
      `INSERT INTO order_status_history (order_id, from_status, to_status, actor, note)
       VALUES (?, NULL, ?, 'demo', 'Donnée de test')`,
      [Number(info.lastInsertRowid), d.status]
    );
  }
});

console.log('✔ Données de démonstration créées (marquées DÉMO, exclues des statistiques réelles).');
console.log('  Purge : Administration > Paramètres > « Purger les données de démonstration ».');
