/**
 * Mesure d'audience « first-party » : les données de trafic sont stockées par
 * WMS lui-même (aucun chiffre inventé). Si Google Analytics 4 est configuré
 * (NEXT_PUBLIC_GA_ID), il est chargé en complément.
 */
import { query, queryOne, run, nowIso } from './db';

export type EventType =
  | 'page_view'
  | 'product_view'
  | 'whatsapp_click'
  | 'checkout_start'
  | 'order_created';

export interface TrackInput {
  type: EventType;
  path?: string;
  productId?: number;
  orderId?: number;
  referrer?: string;
  device?: string;
  visitorId?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
}

export function trackEvent(input: TrackInput): void {
  run(
    `INSERT INTO events (type, path, product_id, order_id, referrer, utm_source, utm_medium,
       utm_campaign, utm_content, utm_term, device, visitor_id, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      input.type,
      input.path ?? null,
      input.productId ?? null,
      input.orderId ?? null,
      input.referrer ?? null,
      input.utm?.source ?? null,
      input.utm?.medium ?? null,
      input.utm?.campaign ?? null,
      input.utm?.content ?? null,
      input.utm?.term ?? null,
      input.device ?? null,
      input.visitorId ?? null,
      nowIso(),
    ],
  );
}

export interface TrafficSummary {
  totalViews: number;
  uniqueVisitors: number;
  productViews: number;
  whatsappClicks: number;
  checkoutStarts: number;
  ordersCreated: number;
  byDay: { day: string; views: number; visitors: number }[];
  bySource: { source: string; views: number; orders: number }[];
  topPaths: { path: string; views: number }[];
  byReferrer: { referrer: string; views: number }[];
  hasData: boolean;
}

export function trafficSummary(days = 30): TrafficSummary {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const totals = queryOne<{
    totalViews: number;
    uniqueVisitors: number;
    productViews: number;
    whatsappClicks: number;
    checkoutStarts: number;
    ordersCreated: number;
  }>(
    `SELECT
        SUM(CASE WHEN type = 'page_view' THEN 1 ELSE 0 END) AS totalViews,
        COUNT(DISTINCT visitor_id) AS uniqueVisitors,
        SUM(CASE WHEN type = 'product_view' THEN 1 ELSE 0 END) AS productViews,
        SUM(CASE WHEN type = 'whatsapp_click' THEN 1 ELSE 0 END) AS whatsappClicks,
        SUM(CASE WHEN type = 'checkout_start' THEN 1 ELSE 0 END) AS checkoutStarts,
        SUM(CASE WHEN type = 'order_created' THEN 1 ELSE 0 END) AS ordersCreated
      FROM events WHERE created_at >= ?`,
    [since],
  );

  const byDay = query<{ day: string; views: number; visitors: number }>(
    `SELECT substr(created_at,1,10) AS day,
            SUM(CASE WHEN type='page_view' THEN 1 ELSE 0 END) AS views,
            COUNT(DISTINCT visitor_id) AS visitors
       FROM events WHERE created_at >= ?
      GROUP BY day ORDER BY day ASC`,
    [since],
  );

  const bySource = query<{ source: string; views: number; orders: number }>(
    `SELECT COALESCE(NULLIF(utm_source,''),'(direct)') AS source,
            SUM(CASE WHEN type='page_view' THEN 1 ELSE 0 END) AS views,
            SUM(CASE WHEN type='order_created' THEN 1 ELSE 0 END) AS orders
       FROM events WHERE created_at >= ?
      GROUP BY source ORDER BY views DESC`,
    [since],
  );

  const topPaths = query<{ path: string; views: number }>(
    `SELECT path, COUNT(*) AS views FROM events
      WHERE type='page_view' AND created_at >= ? AND path IS NOT NULL
      GROUP BY path ORDER BY views DESC LIMIT 15`,
    [since],
  );

  const byReferrer = query<{ referrer: string; views: number }>(
    `SELECT COALESCE(NULLIF(referrer,''),'(direct)') AS referrer, COUNT(*) AS views
       FROM events WHERE type='page_view' AND created_at >= ? AND referrer IS NOT NULL
      GROUP BY referrer ORDER BY views DESC LIMIT 10`,
    [since],
  );

  const totalViews = Number(totals?.totalViews ?? 0);

  return {
    totalViews,
    uniqueVisitors: Number(totals?.uniqueVisitors ?? 0),
    productViews: Number(totals?.productViews ?? 0),
    whatsappClicks: Number(totals?.whatsappClicks ?? 0),
    checkoutStarts: Number(totals?.checkoutStarts ?? 0),
    ordersCreated: Number(totals?.ordersCreated ?? 0),
    byDay,
    bySource,
    topPaths,
    byReferrer,
    hasData: totalViews > 0,
  };
}

export function isGa4Configured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GA_ID);
}
