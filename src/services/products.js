'use strict';
/**
 * Service produits & catégories.
 * Les prix manquants restent NULL (« Prix à confirmer ») — jamais inventés.
 */
const db = require('../db');
const security = require('../security');

function slugify(name) {
  const base = String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || `produit-${Date.now()}`;
}

function uniqueSlug(name, excludeId = null) {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  while (true) {
    const row = excludeId
      ? db.get('SELECT id FROM products WHERE slug = ? AND id != ?', [slug, excludeId])
      : db.get('SELECT id FROM products WHERE slug = ?', [slug]);
    if (!row) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

function listCategories() {
  return db.all('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
}

function listProducts({ category = '', q = '', includeInactive = false, includeDemo = true } = {}) {
  const where = [];
  const params = [];
  if (!includeInactive) where.push('active = 1');
  if (!includeDemo) where.push('is_demo = 0');
  if (category) { where.push('category = ?'); params.push(category); }
  if (q) {
    where.push('(name LIKE ? OR short_description LIKE ? OR description LIKE ?)');
    const like = db.likeParam(q);
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db.all(`SELECT * FROM products ${whereSql} ORDER BY name ASC`, params);
}

function getProduct(id) {
  return db.get('SELECT * FROM products WHERE id = ?', [id]) || null;
}

function getProductBySlug(slug) {
  return db.get('SELECT * FROM products WHERE slug = ?', [slug]) || null;
}

function createProduct(data) {
  const name = security.cleanText(data.name, { max: 150 });
  if (name.length < 2) return { ok: false, error: 'Nom du produit requis.' };
  const category = security.cleanText(data.category, { max: 60 }) || 'autres';
  const cat = db.get('SELECT slug FROM categories WHERE slug = ?', [category]);
  if (!cat) return { ok: false, error: 'Catégorie inconnue.' };
  const price = parsePrice(data.price_fcfa);
  if (price === 'invalid') return { ok: false, error: 'Prix invalide (entier en FCFA, ou vide pour « à confirmer »).' };

  const slug = uniqueSlug(name);
  const info = db.run(
    `INSERT INTO products (slug, name, category, short_description, description, characteristics,
       price_fcfa, stock_enabled, stock_qty, image_url, active, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      slug, name, category,
      security.cleanText(data.short_description, { max: 300 }),
      security.cleanText(data.description, { max: 5000, allowNewlines: true }),
      security.cleanText(data.characteristics, { max: 3000, allowNewlines: true }),
      price,
      data.stock_enabled ? 1 : 0,
      data.stock_qty != null && data.stock_qty !== '' ? Number(data.stock_qty) : null,
      security.cleanText(data.image_url, { max: 300 }) || null,
      data.active === false || data.active === '0' ? 0 : 1,
    ]
  );
  security.audit('product_create', 'products', info.lastInsertRowid, name);
  return { ok: true, id: Number(info.lastInsertRowid), slug };
}

function updateProduct(id, data) {
  const existing = getProduct(id);
  if (!existing) return { ok: false, error: 'Produit introuvable.' };
  const name = security.cleanText(data.name, { max: 150 });
  if (name.length < 2) return { ok: false, error: 'Nom du produit requis.' };
  const category = security.cleanText(data.category, { max: 60 }) || existing.category;
  const cat = db.get('SELECT slug FROM categories WHERE slug = ?', [category]);
  if (!cat) return { ok: false, error: 'Catégorie inconnue.' };
  const price = parsePrice(data.price_fcfa);
  if (price === 'invalid') return { ok: false, error: 'Prix invalide (entier en FCFA, ou vide pour « à confirmer »).' };

  db.run(
    `UPDATE products SET name = ?, category = ?, short_description = ?, description = ?,
       characteristics = ?, price_fcfa = ?, stock_enabled = ?, stock_qty = ?, image_url = ?,
       active = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      name, category,
      security.cleanText(data.short_description, { max: 300 }),
      security.cleanText(data.description, { max: 5000, allowNewlines: true }),
      security.cleanText(data.characteristics, { max: 3000, allowNewlines: true }),
      price,
      data.stock_enabled ? 1 : 0,
      data.stock_qty != null && data.stock_qty !== '' ? Number(data.stock_qty) : null,
      security.cleanText(data.image_url, { max: 300 }) || null,
      data.active === false || data.active === '0' ? 0 : 1,
      id,
    ]
  );
  security.audit('product_update', 'products', id, name);
  return { ok: true, id, slug: existing.slug };
}

function deleteProduct(id) {
  const existing = getProduct(id);
  if (!existing) return { ok: false, error: 'Produit introuvable.' };
  const used = db.get('SELECT COUNT(*) AS n FROM order_items WHERE product_id = ?', [id]).n;
  if (used > 0) {
    // Conserver l'historique : désactivation plutôt que suppression.
    db.run('UPDATE products SET active = 0, updated_at = datetime(\'now\') WHERE id = ?', [id]);
    security.audit('product_deactivate', 'products', id, existing.name);
    return { ok: true, deactivated: true, message: 'Produit déjà commandé : désactivé au lieu de supprimé (historique conservé).' };
  }
  db.run('DELETE FROM products WHERE id = ?', [id]);
  security.audit('product_delete', 'products', id, existing.name);
  return { ok: true };
}

/** Prix : entier positif, ''/null → null (à confirmer), sinon 'invalid'. */
function parsePrice(value) {
  if (value == null || String(value).trim() === '') return null;
  const n = Number(String(value).replace(/\s/g, ''));
  if (!Number.isInteger(n) || n < 0 || n > 100000000) return 'invalid';
  return n;
}

module.exports = {
  listCategories, listProducts, getProduct, getProductBySlug,
  createProduct, updateProduct, deleteProduct, slugify, uniqueSlug, parsePrice,
};
