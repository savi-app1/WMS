/** Statistiques commerciales calculées à partir des commandes réelles. */
import { query, queryOne } from './db';

export interface DailyPoint {
  day: string;
  total: number;
  confirmee: number;
  livree: number;
  annulee: number;
  value: number;
}

export interface MonthlyPoint {
  month: string;
  total: number;
  confirmee: number;
  livree: number;
  annulee: number;
  value: number;
  collected: number;
}

export interface PeriodStats {
  from: string;
  to: string;
  total: number;
  confirmed: number;
  delivered: number;
  cancelled: number;
  pending: number;
  confirmationRate: number;
  deliveryRate: number;
  cancellationRate: number;
  orderValue: number;
  collected: number;
  averageBasket: number;
  itemsSold: number;
}

function startOfPeriod(monthsBack = 0): Date {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1));
  return start;
}

export function statsForPeriod(from: string, to: string): PeriodStats {
  const row = queryOne<{
    total: number;
    confirmed: number;
    delivered: number;
    cancelled: number;
    pending: number;
    value: number;
    collected: number;
  }>(
    `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status IN ('confirmee','en_preparation','en_livraison','livree') THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status = 'livree' THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN status = 'annulee' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status IN ('nouvelle','a_confirmer') THEN 1 ELSE 0 END) AS pending,
        COALESCE(SUM(CASE WHEN price_pending = 0 THEN total_fcfa ELSE 0 END), 0) AS value,
        COALESCE(SUM(amount_paid_fcfa), 0) AS collected
      FROM orders
      WHERE created_at >= ? AND created_at <= ?`,
    [from, to],
  );

  const total = Number(row?.total ?? 0);
  const confirmed = Number(row?.confirmed ?? 0);
  const delivered = Number(row?.delivered ?? 0);
  const cancelled = Number(row?.cancelled ?? 0);
  const value = Number(row?.value ?? 0);
  const collected = Number(row?.collected ?? 0);

  const itemsRow = queryOne<{ c: number }>(
    `SELECT COALESCE(SUM(json_array_length(items)), 0) AS c FROM orders WHERE created_at >= ? AND created_at <= ?`,
    [from, to],
  );

  return {
    from,
    to,
    total,
    confirmed,
    delivered,
    cancelled,
    pending: Number(row?.pending ?? 0),
    confirmationRate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
    deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
    cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
    orderValue: value,
    collected,
    averageBasket: total > 0 ? Math.round(value / total) : 0,
    itemsSold: Number(itemsRow?.c ?? 0),
  };
}

export function dailySeries(from: string, to: string): DailyPoint[] {
  return query<DailyPoint>(
    `SELECT
        substr(created_at, 1, 10) AS day,
        COUNT(*) AS total,
        SUM(CASE WHEN status IN ('confirmee','en_preparation','en_livraison','livree') THEN 1 ELSE 0 END) AS confirmee,
        SUM(CASE WHEN status = 'livree' THEN 1 ELSE 0 END) AS livree,
        SUM(CASE WHEN status = 'annulee' THEN 1 ELSE 0 END) AS annulee,
        COALESCE(SUM(CASE WHEN price_pending = 0 THEN total_fcfa ELSE 0 END), 0) AS value
      FROM orders
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY day ORDER BY day ASC`,
    [from, to],
  );
}

export function monthlySeries(months = 12): MonthlyPoint[] {
  return query<MonthlyPoint>(
    `SELECT
        substr(created_at, 1, 7) AS month,
        COUNT(*) AS total,
        SUM(CASE WHEN status IN ('confirmee','en_preparation','en_livraison','livree') THEN 1 ELSE 0 END) AS confirmee,
        SUM(CASE WHEN status = 'livree' THEN 1 ELSE 0 END) AS livree,
        SUM(CASE WHEN status = 'annulee' THEN 1 ELSE 0 END) AS annulee,
        COALESCE(SUM(CASE WHEN price_pending = 0 THEN total_fcfa ELSE 0 END), 0) AS value,
        COALESCE(SUM(amount_paid_fcfa), 0) AS collected
      FROM orders
      GROUP BY month ORDER BY month ASC LIMIT ?`,
    [months],
  );
}

export interface TopProduct {
  name: string;
  slug: string;
  quantity: number;
  revenue: number;
}

export function topProducts(limit = 5, from?: string, to?: string): TopProduct[] {
  const params: (string | number)[] = [];
  let where = '';
  if (from && to) {
    where = 'WHERE o.created_at >= ? AND o.created_at <= ?';
    params.push(from, to);
  }
  params.push(limit);
  const rows = query<{ name: string; slug: string; quantity: number; revenue: number }>(
    `SELECT
        json_extract(item.value, '$.name') AS name,
        json_extract(item.value, '$.slug') AS slug,
        SUM(json_extract(item.value, '$.quantity')) AS quantity,
        SUM(COALESCE(json_extract(item.value, '$.lineTotalFcfa'), 0)) AS revenue
      FROM orders o, json_each(o.items) item
      ${where}
      GROUP BY name, slug
      ORDER BY quantity DESC, revenue DESC
      LIMIT ?`,
    params,
  );
  return rows.map((r) => ({
    name: r.name,
    slug: r.slug,
    quantity: Number(r.quantity ?? 0),
    revenue: Number(r.revenue ?? 0),
  }));
}

export function statusBreakdown(): Record<string, number> {
  const rows = query<{ status: string; c: number }>('SELECT status, COUNT(*) AS c FROM orders GROUP BY status');
  const result: Record<string, number> = {};
  for (const row of rows) result[row.status] = Number(row.c);
  return result;
}

/** Compteur de nouvelles commandes (badge de notification dans l'administration). */
export function newOrderCount(): number {
  const row = queryOne<{ c: number }>(
    `SELECT COUNT(*) AS c FROM orders WHERE status IN ('nouvelle','a_confirmer')`,
  );
  return Number(row?.c ?? 0);
}

/** Commandes sans traitement depuis plus de `hours` heures (relance interne). */
export function staleOrders(hours = 24): { order_number: string; customer_name: string; phone: string; created_at: string; status: string }[] {
  const limit = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  return query(
    `SELECT order_number, customer_name, phone, created_at, status
       FROM orders
      WHERE status IN ('nouvelle','a_confirmer') AND created_at < ?
      ORDER BY created_at ASC LIMIT 50`,
    [limit],
  );
}

/** Comparaison avec la période précédente (même durée). */
export function compareWithPreviousPeriod(days = 30): { current: PeriodStats; previous: PeriodStats } {
  const now = new Date();
  const currentFrom = new Date(now.getTime() - days * 86400000).toISOString();
  const currentTo = now.toISOString();
  const previousFrom = new Date(now.getTime() - days * 2 * 86400000).toISOString();
  const previousTo = currentFrom;
  return {
    current: statsForPeriod(currentFrom, currentTo),
    previous: statsForPeriod(previousFrom, previousTo),
  };
}

export function defaultPeriod(monthsBack = 0): { from: string; to: string } {
  const start = startOfPeriod(monthsBack);
  return { from: start.toISOString(), to: new Date().toISOString() };
}
