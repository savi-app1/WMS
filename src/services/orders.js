'use strict';
/**
 * Service commandes — création, statuts, montants et historique.
 * Règles : aucune confirmation automatique, livraison ≠ paiement.
 */
const crypto = require('crypto');
const db = require('../db');
const security = require('../security');

const STATUSES = ['nouvelle', 'a_confirmer', 'confirmee', 'en_preparation', 'en_livraison', 'livree', 'annulee'];

const STATUS_LABELS = {
  nouvelle: 'Nouvelle commande',
  a_confirmer: 'À confirmer',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  en_livraison: 'En livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
};

/** Transitions autorisées (statut → statuts atteignables manuellement). */
const TRANSITIONS = {
  nouvelle: ['a_confirmer', 'confirmee', 'annulee'],
  a_confirmer: ['confirmee', 'annulee'],
  confirmee: ['en_preparation', 'annulee', 'livree'],
  en_preparation: ['en_livraison', 'annulee', 'livree'],
  en_livraison: ['livree', 'annulee'],
  livree: [],
  annulee: [],
};

const OPEN_STATUSES = ['nouvelle', 'a_confirmer', 'confirmee', 'en_preparation', 'en_livraison'];

function generateOrderNumber() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  for (let i = 0; i < 10; i += 1) {
    const suffix = crypto.randomInt(0, 10000).toString().padStart(4, '0');
    const number = `WMS-${y}${m}${d}-${suffix}`;
    const exists = db.get('SELECT id FROM orders WHERE order_number = ?', [number]);
    if (!exists) return number;
  }
  throw new Error('Impossible de générer un numéro de commande unique');
}

/**
 * Valide une demande de commande. Renvoie { ok, errors, items }.
 * items = [{ productId, quantity, name, unitPrice }]
 */
function validateOrderInput({ customerName, customerPhone, customerAddress, customerZone, customerNotes, items }) {
  const errors = [];
  const name = security.cleanText(customerName, { max: 120 });
  const phoneRaw = security.cleanText(customerPhone, { max: 30 });
  const address = security.cleanText(customerAddress, { max: 300 });
  const zone = security.cleanText(customerZone, { max: 80 });
  const notes = security.cleanText(customerNotes, { max: 500, allowNewlines: true });

  if (name.length < 2) errors.push('Le nom complet est requis (2 caractères minimum).');
  if (!security.isValidPhone(phoneRaw)) {
    errors.push('Numéro de téléphone invalide. Exemple : +226 70 00 13 17 ou 70001317.');
  }
  if (address.length < 5) errors.push('L’adresse de livraison est requise (5 caractères minimum).');

  const cleanItems = [];
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Aucun produit dans la commande.');
  } else {
    for (const raw of items) {
      const productId = Number(raw.productId);
      const quantity = Number(raw.quantity);
      const product = db.get(
        'SELECT id, name, slug, price_fcfa, active, stock_enabled, stock_qty FROM products WHERE id = ?',
        [productId]
      );
      if (!product || !product.active) {
        errors.push('Produit introuvable ou indisponible.');
        continue;
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        errors.push(`Quantité invalide pour « ${product.name} » (1 à 100).`);
        continue;
      }
      if (product.stock_enabled && product.stock_qty != null && quantity > product.stock_qty) {
        errors.push(`Stock insuffisant pour « ${product.name} » (${product.stock_qty} disponible(s)).`);
        continue;
      }
      cleanItems.push({
        productId: product.id,
        quantity,
        name: product.name,
        unitPrice: product.price_fcfa, // prix SERVEUR uniquement — jamais le prix envoyé par le client
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    values: { name, phoneRaw, address, zone, notes },
    items: cleanItems,
  };
}

/** Calcule les montants à partir des prix enregistrés côté serveur. */
function computeAmounts(items, deliveryFee) {
  let pricesIncomplete = false;
  let itemsTotal = 0;
  for (const it of items) {
    if (it.unitPrice == null) {
      pricesIncomplete = true;
    } else {
      itemsTotal += it.unitPrice * it.quantity;
    }
  }
  const feeKnown = deliveryFee != null;
  const amountOrdered = pricesIncomplete || !feeKnown ? null : itemsTotal + deliveryFee;
  return { itemsTotal, pricesIncomplete, amountOrdered, feeKnown };
}

/** Enregistre une commande (statut initial « nouvelle » — jamais confirmée automatiquement). */
function createOrder(input) {
  const v = validateOrderInput(input);
  if (!v.ok) return v;

  const deliveryFee = resolveDeliveryFee(v.values.zone);
  const { itemsTotal, pricesIncomplete, amountOrdered } = computeAmounts(v.items, deliveryFee);
  const phone = security.normalizePhone(v.values.phoneRaw);

  const result = db.transaction(() => {
    const orderNumber = generateOrderNumber();
    const info = db.run(
      `INSERT INTO orders
        (order_number, customer_name, customer_phone, customer_phone_raw, customer_address,
         customer_zone, customer_notes, status, payment_method, delivery_fee_fcfa,
         amount_ordered, prices_incomplete, is_demo, utm_source, utm_medium, utm_campaign)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'nouvelle', 'livraison', ?, ?, ?, 0, ?, ?, ?)`,
      [
        orderNumber, v.values.name, phone, v.values.phoneRaw, v.values.address,
        v.values.zone, v.values.notes, deliveryFee, amountOrdered, pricesIncomplete ? 1 : 0,
        security.cleanText(input.utmSource, { max: 60 }),
        security.cleanText(input.utmMedium, { max: 60 }),
        security.cleanText(input.utmCampaign, { max: 60 }),
      ]
    );
    const orderId = Number(info.lastInsertRowid);
    for (const it of v.items) {
      const lineTotal = it.unitPrice == null ? null : it.unitPrice * it.quantity;
      db.run(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price_fcfa, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, it.productId, it.name, it.unitPrice, it.quantity, lineTotal]
      );
    }
    db.run(
      `INSERT INTO order_status_history (order_id, from_status, to_status, actor, note)
       VALUES (?, NULL, 'nouvelle', 'client', 'Commande enregistrée depuis le site')`,
      [orderId]
    );
    return { orderId, orderNumber, itemsTotal, amountOrdered };
  });

  return { ok: true, ...result, items: v.items, values: v.values, deliveryFee };
}

function resolveDeliveryFee(zone) {
  const zones = readDeliveryZones();
  if (!zone) return Object.keys(zones).length === 0 ? null : null;
  const key = zone.toLowerCase();
  for (const [k, fee] of Object.entries(zones)) {
    if (k.toLowerCase() === key) return Number(fee);
  }
  return null;
}

function readDeliveryZones() {
  const row = db.get("SELECT value FROM settings WHERE key = 'delivery_zones'");
  if (row) {
    try { return JSON.parse(row.value); } catch { return {}; }
  }
  return configZones();
}

function configZones() {
  const { config } = require('../config');
  return config.deliveryZones || {};
}

/** Change le statut d'une commande (action manuelle de l'administrateur). */
function changeStatus(orderId, toStatus, { note = '', actor = 'admin', amountOverride = null, amountCashed = null } = {}) {
  if (!STATUSES.includes(toStatus)) return { ok: false, error: 'Statut inconnu.' };
  const order = db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) return { ok: false, error: 'Commande introuvable.' };
  if (order.status === toStatus) return { ok: false, error: 'La commande a déjà ce statut.' };
  if (!TRANSITIONS[order.status].includes(toStatus)) {
    return {
      ok: false,
      error: `Transition interdite : ${STATUS_LABELS[order.status]} → ${STATUS_LABELS[toStatus]}.`,
    };
  }

  const now = new Date().toISOString();
  const fields = ['status = ?', 'updated_at = ?'];
  const params = [toStatus, now];

  if (toStatus === 'confirmee') {
    fields.push('confirmed_at = ?');
    params.push(now);
    // Montant confirmé : valeur fournie par l'admin ou montant commandé connu.
    const amount = amountOverride != null ? Number(amountOverride) : order.amount_ordered;
    if (amount != null) { fields.push('amount_confirmed = ?'); params.push(amount); }
  }
  if (toStatus === 'livree') {
    fields.push('delivered_at = ?');
    params.push(now);
    const amount = amountOverride != null ? Number(amountOverride) : (order.amount_confirmed ?? order.amount_ordered);
    if (amount != null) { fields.push('amount_delivered = ?'); params.push(amount); }
    // Attention : la livraison NE déclenche JAMAIS un encaissement automatique.
  }
  if (toStatus === 'annulee') {
    fields.push('cancelled_at = ?');
    params.push(now);
  }

  params.push(orderId);
  db.transaction(() => {
    db.run(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, params);
    db.run(
      `INSERT INTO order_status_history (order_id, from_status, to_status, actor, note)
       VALUES (?, ?, ?, ?, ?)`,
      [orderId, order.status, toStatus, actor, security.cleanText(note, { max: 300 })]
    );
    // Décrémenter le stock à la livraison si suivi
    if (toStatus === 'livree') decrementStock(orderId);
    if (amountCashed != null && Number(amountCashed) >= 0) {
      setAmountCashed(orderId, Number(amountCashed), actor);
    }
  });

  security.audit('order_status', 'orders', orderId,
    `${order.status} → ${toStatus}${note ? ` (${note})` : ''}`, actor);
  return { ok: true };
}

function decrementStock(orderId) {
  const items = db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
  for (const it of items) {
    if (!it.product_id) continue;
    const p = db.get('SELECT stock_enabled, stock_qty FROM products WHERE id = ?', [it.product_id]);
    if (p && p.stock_enabled && p.stock_qty != null) {
      db.run('UPDATE products SET stock_qty = MAX(0, stock_qty - ?), updated_at = datetime(\'now\') WHERE id = ?',
        [it.quantity, it.product_id]);
    }
  }
}

/** Enregistre un encaissement réel (saisi manuellement après remise du colis). */
function setAmountCashed(orderId, amount, actor = 'admin') {
  const order = db.get('SELECT id, amount_cashed FROM orders WHERE id = ?', [orderId]);
  if (!order) return { ok: false, error: 'Commande introuvable.' };
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, error: 'Montant invalide.' };
  db.run('UPDATE orders SET amount_cashed = ?, updated_at = datetime(\'now\') WHERE id = ?', [amount, orderId]);
  security.audit('order_cashed', 'orders', orderId, `Encaissement : ${amount} FCFA`, actor);
  return { ok: true };
}

function getOrder(orderId) {
  const order = db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) return null;
  order.items = db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  order.history = db.all(
    'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC, id ASC', [orderId]
  );
  return order;
}

function getOrderNumber(orderNumber) {
  const order = db.get('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);
  return order ? getOrder(order.id) : null;
}

/** Liste filtrée des commandes (administration). */
function listOrders({ status = '', q = '', page = 1, perPage = 20, demo = 'all' } = {}) {
  const where = [];
  const params = [];
  if (status && STATUSES.includes(status)) {
    where.push('o.status = ?');
    params.push(status);
  }
  if (demo === 'hide') where.push('o.is_demo = 0');
  if (demo === 'only') where.push('o.is_demo = 1');
  if (q) {
    where.push('(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)');
    const like = db.likeParam(q);
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.get(`SELECT COUNT(*) AS n FROM orders o ${whereSql}`, params).n;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, Number(page) || 1), pages);
  const rows = db.all(
    `SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count
       FROM orders o ${whereSql}
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT ? OFFSET ?`,
    [...params, perPage, (current - 1) * perPage]
  );
  return { rows, total, pages, page: current };
}

function statusCounts({ demo = 'hide' } = {}) {
  const demoFilter = demo === 'hide' ? 'WHERE is_demo = 0' : '';
  const rows = db.all(`SELECT status, COUNT(*) AS n FROM orders ${demoFilter} GROUP BY status`);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of rows) counts[r.status] = r.n;
  counts.total = rows.reduce((acc, r) => acc + r.n, 0);
  counts.open = OPEN_STATUSES.reduce((acc, s) => acc + counts[s], 0);
  counts.nouvelles = counts.nouvelle + counts.a_confirmer;
  return counts;
}

/** Commandes restées sans traitement depuis trop longtemps (rappels internes). */
function staleOrders(hours = 24) {
  return db.all(
    `SELECT * FROM orders
      WHERE status IN ('nouvelle','a_confirmer')
        AND created_at < datetime('now', ?)
        AND is_demo = 0
      ORDER BY created_at ASC`,
    [`-${Number(hours)} hours`]
  );
}

/** Alertes de stock faible. */
function lowStockProducts(threshold = 3) {
  return db.all(
    `SELECT * FROM products
      WHERE stock_enabled = 1 AND stock_qty IS NOT NULL AND stock_qty <= ?
        AND active = 1 AND is_demo = 0
      ORDER BY stock_qty ASC`,
    [threshold]
  );
}

module.exports = {
  STATUSES, STATUS_LABELS, TRANSITIONS, OPEN_STATUSES,
  generateOrderNumber, validateOrderInput, computeAmounts, createOrder,
  changeStatus, setAmountCashed, getOrder, getOrderNumber, listOrders,
  statusCounts, staleOrders, lowStockProducts, resolveDeliveryFee, readDeliveryZones,
};
