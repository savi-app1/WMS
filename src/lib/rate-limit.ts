/**
 * Limitation de débit (anti-spam et anti-abus) sur les endpoints publics.
 * Compteur en base : survives aux redémarrages et fonctionne en mono-instance.
 */
import { query, run, nowIso } from './db';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const row = query<{ c: number }>(
    'SELECT COUNT(*) AS c FROM rate_limits WHERE bucket = ? AND created_at > ?',
    [key, since],
  );
  const count = Number(row[0]?.c ?? 0);
  if (count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: windowSeconds };
  }
  run('INSERT INTO rate_limits (bucket, created_at) VALUES (?, ?)', [key, nowIso()]);
  run(`DELETE FROM rate_limits WHERE created_at < datetime('now', '-1 day')`);
  return { allowed: true, remaining: limit - count - 1, retryAfterSeconds: 0 };
}
