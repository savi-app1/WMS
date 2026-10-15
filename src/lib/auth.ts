/**
 * Authentification de l'administrateur unique.
 *
 *  - Mots de passe hachés avec scrypt (node:crypto), sel aléatoire par compte.
 *  - Sessions opaques (jeton aléatoire 256 bits) stockées en base, le cookie ne
 *    contient que le jeton ; la base ne stocke que son empreinte SHA-256.
 *  - Cookie HttpOnly + SameSite=Lax + Secure en production.
 *  - Double soumission CSRF (cookie lisible + en-tête `x-csrf-token`).
 *  - Limitation des tentatives de connexion (par compte et par IP).
 */
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { queryOne, run, nowIso } from './db';
import { SESSION_COOKIE, CSRF_COOKIE, SESSION_TTL_HOURS, MAX_LOGIN_ATTEMPTS, LOGIN_WINDOW_MINUTES } from './constants';

export { SESSION_COOKIE, CSRF_COOKIE, SESSION_TTL_HOURS, MAX_LOGIN_ATTEMPTS, LOGIN_WINDOW_MINUTES } from './constants';

const SCRYPT_N = 16384;
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const KEY_LENGTH = 64;

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
  last_login_at: string | null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p });
  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_r,
    SCRYPT_p,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$');
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const derived = scryptSync(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Empreinte non réversible de l'IP (GDPR/privacy : on ne stocke pas d'IP brute). */
export function hashIp(ip: string): string {
  return createHash('sha256').update(`wms:${ip}`).digest('hex').slice(0, 32);
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h.get('x-real-ip') || '127.0.0.1';
}

/* ---------------------------- Sessions ---------------------------- */

export async function createSession(userId: number): Promise<{ token: string; expiresAt: string }> {
  const token = randomBytes(32).toString('base64url');
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();
  run(
    'INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent, ip_hash) VALUES (?, ?, ?, ?, ?, ?)',
    [
      hashToken(token),
      userId,
      nowIso(),
      expiresAt,
      (h.get('user-agent') || '').slice(0, 255),
      hashIp(await getClientIp()),
    ],
  );
  // Nettoyage opportuniste des sessions expirées
  run('DELETE FROM sessions WHERE expires_at < ?', [nowIso()]);
  return { token, expiresAt };
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = queryOne<AdminUser & { expires_at: string; active: number }>(
    `SELECT u.id, u.email, u.name, u.role, u.created_at, u.last_login_at, s.expires_at, u.active
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND u.active = 1`,
    [hashToken(token)],
  );
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    run('DELETE FROM sessions WHERE id = ?', [hashToken(token)]);
    return null;
  }
  const { expires_at: _expires, active: _active, ...user } = row;
  return user;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) run('DELETE FROM sessions WHERE id = ?', [hashToken(token)]);
  store.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: number): Promise<void> {
  run('DELETE FROM sessions WHERE user_id = ?', [userId]);
}

/* --------------------------- CSRF --------------------------------- */

export async function ensureCsrfToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE)?.value;
  if (existing) return existing;
  const token = randomUUID();
  store.set(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_HOURS * 3600,
  });
  return token;
}

export async function isValidCsrf(request: Request): Promise<boolean> {
  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get('x-csrf-token');
  if (!cookieToken || !headerToken) return false;
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ------------------- Limitation des tentatives --------------------- */

export function recordLoginAttempt(identifier: string, ipHash: string, success: boolean): void {
  run(
    'INSERT INTO login_attempts (identifier, ip_hash, success, created_at) VALUES (?, ?, ?, ?)',
    [identifier, ipHash, success ? 1 : 0, nowIso()],
  );
  run(
    `DELETE FROM login_attempts WHERE created_at < datetime('now', '-7 days')`,
    [],
  );
}

export function isLoginBlocked(identifier: string, ipHash: string): { blocked: boolean; remaining: number } {
  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000).toISOString();
  const byAccount = queryOne<{ c: number }>(
    'SELECT COUNT(*) AS c FROM login_attempts WHERE identifier = ? AND success = 0 AND created_at > ?',
    [identifier, since],
  );
  const byIp = queryOne<{ c: number }>(
    'SELECT COUNT(*) AS c FROM login_attempts WHERE ip_hash = ? AND success = 0 AND created_at > ?',
    [ipHash, since],
  );
  const failures = Math.max(Number(byAccount?.c ?? 0), Number(byIp?.c ?? 0));
  return { blocked: failures >= MAX_LOGIN_ATTEMPTS, remaining: Math.max(0, MAX_LOGIN_ATTEMPTS - failures) };
}

export function countActiveSessions(userId: number): number {
  const row = queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM sessions WHERE user_id = ? AND expires_at > ?', [
    userId,
    nowIso(),
  ]);
  return Number(row?.c ?? 0);
}
