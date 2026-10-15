'use strict';
/**
 * Export CSV des commandes (UTF-8 avec BOM pour Excel).
 */
const db = require('../db');

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function ordersCsv({ status = '', from = '', to = '', demo = 'hide' } = {}) {
  const where = [];
  const params = [];
  if (status) { where.push('o.status = ?'); params.push(status); }
  if (from) { where.push('o.created_at >= ?'); params.push(from); }
  if (to) { where.push('o.created_at < date(?, \'+1 day\')'); params.push(to); }
  if (demo === 'hide') where.push('o.is_demo = 0');
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = db.all(
    `SELECT o.* FROM orders o ${whereSql} ORDER BY o.created_at ASC, o.id ASC`,
    params
  );

  const header = [
    'numero_commande', 'date', 'statut', 'client', 'telephone', 'adresse', 'zone',
    'produits', 'quantite_totale', 'montant_commande_fcfa', 'montant_confirme_fcfa',
    'montant_livre_fcfa', 'montant_encaisse_fcfa', 'frais_livraison_fcfa',
    'mode_paiement', 'notes', 'utm_source', 'utm_medium', 'utm_campaign',
  ];

  const lines = [header.join(',')];
  for (const o of rows) {
    const items = db.all('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
    const products = items.map((i) => `${i.product_name} x${i.quantity}`).join(' | ');
    const qty = items.reduce((a, i) => a + i.quantity, 0);
    lines.push([
      o.order_number,
      o.created_at,
      o.status,
      o.customer_name,
      o.customer_phone_raw,
      o.customer_address,
      o.customer_zone,
      products,
      qty,
      o.amount_ordered ?? '',
      o.amount_confirmed ?? '',
      o.amount_delivered ?? '',
      o.amount_cashed ?? '',
      o.delivery_fee_fcfa ?? '',
      o.payment_method,
      o.customer_notes,
      o.utm_source,
      o.utm_medium,
      o.utm_campaign,
    ].map(csvEscape).join(','));
  }
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

function scriptsCsv() {
  const rows = db.all('SELECT * FROM scripts ORDER BY created_at DESC');
  const header = ['id', 'titre', 'type', 'categorie', 'statut', 'tags', 'source', 'contenu', 'cree_le', 'maj_le'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([r.id, r.title, r.type, r.category, r.status, r.tags, r.source_note, r.content, r.created_at, r.updated_at]
      .map(csvEscape).join(','));
  }
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

module.exports = { ordersCsv, scriptsCsv, csvEscape };
