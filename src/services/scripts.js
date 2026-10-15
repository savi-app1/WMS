'use strict';
/**
 * Bibliothèque « Scripts et contenus WMS » + préparation de campagnes.
 * Les textes importés restent des brouillons jusqu'à validation manuelle.
 */
const db = require('../db');
const security = require('../security');

const SCRIPT_TYPES = ['script_video', 'voix_off', 'publication', 'dialogue', 'accroche', 'faq', 'autre'];
const SCRIPT_STATUSES = ['brouillon', 'valide', 'archive'];
const CAMPAIGN_STATUSES = ['brouillon', 'pret', 'en_cours', 'termine'];

function listScripts({ q = '', type = '', status = '' } = {}) {
  const where = [];
  const params = [];
  if (type && SCRIPT_TYPES.includes(type)) { where.push('type = ?'); params.push(type); }
  if (status && SCRIPT_STATUSES.includes(status)) { where.push('status = ?'); params.push(status); }
  if (q) {
    where.push('(title LIKE ? OR content LIKE ? OR tags LIKE ?)');
    const like = db.likeParam(q);
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db.all(`SELECT * FROM scripts ${whereSql} ORDER BY updated_at DESC`, params);
}

function getScript(id) {
  return db.get('SELECT * FROM scripts WHERE id = ?', [id]) || null;
}

function createScript(data) {
  const title = security.cleanText(data.title, { max: 150 });
  if (title.length < 2) return { ok: false, error: 'Titre requis.' };
  const type = SCRIPT_TYPES.includes(data.type) ? data.type : 'autre';
  const status = SCRIPT_STATUSES.includes(data.status) ? data.status : 'brouillon';
  const info = db.run(
    `INSERT INTO scripts (title, type, category, content, tags, source_note, status, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      title, type,
      security.cleanText(data.category, { max: 80 }),
      security.cleanText(data.content, { max: 20000, allowNewlines: true }),
      security.cleanText(data.tags, { max: 200 }),
      security.cleanText(data.source_note, { max: 300 }),
      status,
    ]
  );
  security.audit('script_create', 'scripts', info.lastInsertRowid, title);
  return { ok: true, id: Number(info.lastInsertRowid) };
}

function updateScript(id, data) {
  const existing = getScript(id);
  if (!existing) return { ok: false, error: 'Script introuvable.' };
  const title = security.cleanText(data.title, { max: 150 });
  if (title.length < 2) return { ok: false, error: 'Titre requis.' };
  db.run(
    `UPDATE scripts SET title = ?, type = ?, category = ?, content = ?, tags = ?,
       source_note = ?, status = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      title,
      SCRIPT_TYPES.includes(data.type) ? data.type : existing.type,
      security.cleanText(data.category, { max: 80 }),
      security.cleanText(data.content, { max: 20000, allowNewlines: true }),
      security.cleanText(data.tags, { max: 200 }),
      security.cleanText(data.source_note, { max: 300 }),
      SCRIPT_STATUSES.includes(data.status) ? data.status : existing.status,
      id,
    ]
  );
  security.audit('script_update', 'scripts', id, title);
  return { ok: true, id };
}

function duplicateScript(id) {
  const s = getScript(id);
  if (!s) return { ok: false, error: 'Script introuvable.' };
  const info = db.run(
    `INSERT INTO scripts (title, type, category, content, tags, source_note, status, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, 'brouillon', ?)`,
    [`(copie) ${s.title}`.slice(0, 150), s.type, s.category, s.content, s.tags, s.source_note, s.is_demo]
  );
  security.audit('script_duplicate', 'scripts', info.lastInsertRowid, s.title);
  return { ok: true, id: Number(info.lastInsertRowid) };
}

function deleteScript(id) {
  const s = getScript(id);
  if (!s) return { ok: false, error: 'Script introuvable.' };
  db.run('DELETE FROM scripts WHERE id = ?', [id]);
  security.audit('script_delete', 'scripts', id, s.title);
  return { ok: true };
}

// ---------- Campagnes ----------

function listCampaigns({ status = '' } = {}) {
  const where = [];
  const params = [];
  if (status && CAMPAIGN_STATUSES.includes(status)) { where.push('c.status = ?'); params.push(status); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db.all(
    `SELECT c.*, s.title AS script_title FROM campaigns c
       LEFT JOIN scripts s ON s.id = c.script_id
       ${whereSql} ORDER BY c.updated_at DESC`,
    params
  );
}

function getCampaign(id) {
  return db.get('SELECT * FROM campaigns WHERE id = ?', [id]) || null;
}

function createCampaign(data) {
  const name = security.cleanText(data.name, { max: 150 });
  if (name.length < 2) return { ok: false, error: 'Nom de campagne requis.' };
  const status = CAMPAIGN_STATUSES.includes(data.status) ? data.status : 'brouillon';
  const budget = data.budget_fcfa != null && String(data.budget_fcfa).trim() !== ''
    ? Number(data.budget_fcfa) : null;
  if (budget != null && (!Number.isFinite(budget) || budget < 0)) {
    return { ok: false, error: 'Budget invalide.' };
  }
  const info = db.run(
    `INSERT INTO campaigns (name, objective, product_service, ad_text, script_id, platform,
       product_link, utm_string, budget_fcfa, start_date, end_date, status, notes, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      name,
      security.cleanText(data.objective, { max: 300 }),
      security.cleanText(data.product_service, { max: 150 }),
      security.cleanText(data.ad_text, { max: 10000, allowNewlines: true }),
      data.script_id ? Number(data.script_id) : null,
      security.cleanText(data.platform, { max: 100 }),
      security.cleanText(data.product_link, { max: 300 }),
      security.cleanText(data.utm_string, { max: 300 }),
      budget,
      security.cleanText(data.start_date, { max: 20 }),
      security.cleanText(data.end_date, { max: 20 }),
      status,
      security.cleanText(data.notes, { max: 2000, allowNewlines: true }),
    ]
  );
  security.audit('campaign_create', 'campaigns', info.lastInsertRowid, name);
  return { ok: true, id: Number(info.lastInsertRowid) };
}

function updateCampaign(id, data) {
  const existing = getCampaign(id);
  if (!existing) return { ok: false, error: 'Campagne introuvable.' };
  const name = security.cleanText(data.name, { max: 150 });
  if (name.length < 2) return { ok: false, error: 'Nom de campagne requis.' };
  const budget = data.budget_fcfa != null && String(data.budget_fcfa).trim() !== ''
    ? Number(data.budget_fcfa) : null;
  if (budget != null && (!Number.isFinite(budget) || budget < 0)) {
    return { ok: false, error: 'Budget invalide.' };
  }
  db.run(
    `UPDATE campaigns SET name = ?, objective = ?, product_service = ?, ad_text = ?, script_id = ?,
       platform = ?, product_link = ?, utm_string = ?, budget_fcfa = ?, start_date = ?, end_date = ?,
       status = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      name,
      security.cleanText(data.objective, { max: 300 }),
      security.cleanText(data.product_service, { max: 150 }),
      security.cleanText(data.ad_text, { max: 10000, allowNewlines: true }),
      data.script_id ? Number(data.script_id) : null,
      security.cleanText(data.platform, { max: 100 }),
      security.cleanText(data.product_link, { max: 300 }),
      security.cleanText(data.utm_string, { max: 300 }),
      budget,
      security.cleanText(data.start_date, { max: 20 }),
      security.cleanText(data.end_date, { max: 20 }),
      CAMPAIGN_STATUSES.includes(data.status) ? data.status : existing.status,
      security.cleanText(data.notes, { max: 2000, allowNewlines: true }),
      id,
    ]
  );
  security.audit('campaign_update', 'campaigns', id, name);
  return { ok: true, id };
}

function deleteCampaign(id) {
  const c = getCampaign(id);
  if (!c) return { ok: false, error: 'Campagne introuvable.' };
  db.run('DELETE FROM campaigns WHERE id = ?', [id]);
  security.audit('campaign_delete', 'campaigns', id, c.name);
  return { ok: true };
}

module.exports = {
  SCRIPT_TYPES, SCRIPT_STATUSES, CAMPAIGN_STATUSES,
  listScripts, getScript, createScript, updateScript, duplicateScript, deleteScript,
  listCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign,
};
