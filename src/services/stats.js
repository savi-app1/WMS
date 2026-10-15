'use strict';
/**
 * Statistiques commerciales — calculées uniquement sur des données réelles.
 * Aucun chiffre n'est jamais inventé ou extrapolé.
 */
const db = require('../db');

function monthlyStats({ year, month, demo = 'hide' } = {}) {
  const demoFilter = demo === 'hide' ? 'AND is_demo = 0' : '';
  const y = Number(year) || new Date().getFullYear();
  const m = Number(month) || new Date().getMonth() + 1;
  const periodStart = `${y}-${String(m).padStart(2, '0')}-01`;
  const periodEnd = `${y}-${String(m).padStart(2, '0')}-31`;

  const inPeriod = (alias = '') => `${alias}created_at >= '${periodStart}' AND ${alias}created_at < date('${periodStart}', '+1 month') ${demoFilter}`;

  const byStatus = db.all(
    `SELECT status, COUNT(*) AS n, SUM(amount_ordered) AS ordered,
            SUM(amount_confirmed) AS confirmed, SUM(amount_delivered) AS delivered,
            SUM(amount_cashed) AS cashed
       FROM orders WHERE ${inPeriod()}
      GROUP BY status`
  );

  const totals = db.get(
    `SELECT COUNT(*) AS orders_count,
            SUM(CASE WHEN status NOT IN ('annulee') THEN 1 ELSE 0 END) AS non_cancelled,
            SUM(CASE WHEN status IN ('confirmee','en_preparation','en_livraison','livree') THEN 1 ELSE 0 END) AS confirmed_count,
            SUM(CASE WHEN status = 'livree' THEN 1 ELSE 0 END) AS delivered_count,
            SUM(CASE WHEN status = 'annulee' THEN 1 ELSE 0 END) AS cancelled_count,
            SUM(amount_ordered) AS amount_ordered,
            SUM(amount_confirmed) AS amount_confirmed,
            SUM(amount_delivered) AS amount_delivered,
            SUM(amount_cashed) AS amount_cashed
       FROM orders WHERE ${inPeriod()}`
  ) || {};

  const byDay = db.all(
    `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n,
            SUM(CASE WHEN status = 'livree' THEN 1 ELSE 0 END) AS delivered
       FROM orders WHERE ${inPeriod()}
      GROUP BY day ORDER BY day ASC`
  );

  const topProducts = db.all(
    `SELECT i.product_name, SUM(i.quantity) AS qty,
            SUM(COALESCE(i.line_total, 0)) AS total_known
       FROM order_items i JOIN orders o ON o.id = i.order_id
      WHERE ${inPeriod('o.')}
      GROUP BY i.product_name ORDER BY qty DESC LIMIT 10`
  );

  // Période précédente (comparaison)
  const prevStart = `date('${periodStart}', '-1 month')`;
  const prevTotals = db.get(
    `SELECT COUNT(*) AS orders_count,
            SUM(CASE WHEN status = 'livree' THEN 1 ELSE 0 END) AS delivered_count,
            SUM(amount_ordered) AS amount_ordered,
            SUM(amount_cashed) AS amount_cashed
       FROM orders
      WHERE created_at >= ${prevStart} AND created_at < '${periodStart}' ${demoFilter}`
  ) || {};

  const confirmRate = totals.non_cancelled
    ? Math.round((totals.confirmed_count / totals.non_cancelled) * 1000) / 10
    : null;
  const deliveryRate = totals.confirmed_count
    ? Math.round((totals.delivered_count / totals.confirmed_count) * 1000) / 10
    : null;

  return {
    year: y,
    month: m,
    label: new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    byStatus, byDay, topProducts,
    totals: {
      ...totals,
      confirmRate,
      deliveryRate,
    },
    previous: prevTotals,
  };
}

function dashboardStats({ demo = 'hide' } = {}) {
  const counts = require('./orders').statusCounts({ demo });
  const month = monthlyStats({ demo });
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = db.get(
    `SELECT COUNT(*) AS n FROM orders WHERE substr(created_at, 1, 10) = ? ${demo === 'hide' ? 'AND is_demo = 0' : ''}`,
    [today]
  ).n;
  return { counts, month, todayCount };
}

/** Événements de trafic internes (réels uniquement). */
function trafficSummary(days = 30) {
  const rows = db.all(
    `SELECT type, COUNT(*) AS n FROM events
      WHERE created_at >= datetime('now', ?)
      GROUP BY type`,
    [`-${Number(days)} days`]
  );
  const byType = Object.fromEntries(rows.map((r) => [r.type, r.n]));
  const byUtm = db.all(
    `SELECT utm_source, utm_medium, utm_campaign, COUNT(*) AS n
       FROM events
      WHERE created_at >= datetime('now', ?) AND (utm_source != '' OR utm_medium != '' OR utm_campaign != '')
      GROUP BY utm_source, utm_medium, utm_campaign
      ORDER BY n DESC LIMIT 20`,
    [`-${Number(days)} days`]
  );
  return { days, byType, byUtm };
}

function trackEvent({ type, path = '', productId = null, detail = '', utm = {}, referrer = '', ipHash = '' }) {
  db.run(
    `INSERT INTO events (type, path, product_id, detail, utm_source, utm_medium, utm_campaign, referrer, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(type).slice(0, 40),
      String(path).slice(0, 200),
      productId != null ? Number(productId) : null,
      String(detail).slice(0, 200),
      String(utm.utm_source || '').slice(0, 60),
      String(utm.utm_medium || '').slice(0, 60),
      String(utm.utm_campaign || '').slice(0, 60),
      String(referrer).slice(0, 300),
      String(ipHash).slice(0, 32),
    ]
  );
}

/** Résumé mensuel (commandes + livraisons) pour les notifications internes. */
function monthlySummaryReport(year, month) {
  const s = monthlyStats({ year, month, demo: 'all' });
  return {
    period: s.label,
    orders: s.totals.orders_count || 0,
    confirmed: s.totals.confirmed_count || 0,
    delivered: s.totals.delivered_count || 0,
    cancelled: s.totals.cancelled_count || 0,
    amountOrdered: s.totals.amount_ordered || 0,
    amountCashed: s.totals.amount_cashed || 0,
  };
}

module.exports = { monthlyStats, dashboardStats, trafficSummary, trackEvent, monthlySummaryReport };
