'use strict';
/**
 * Sécurité WMS — hachage de mots de passe (scrypt), sessions, CSRF,
 * normalisation des téléphones et validation des saisies.
 */
const crypto = require('crypto');
const db = require('./db');
const { config } = require('./config');

// ---------- Mots de passe (scrypt, sel aléatoire) ----------

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_PARAMS.keylen, SCRYPT_PARAMS);
  return `scrypt:${SCRYPT_PARAMS.N}:${SCRYPT_PARAMS.r}:${SCRYPT_PARAMS.p}:${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, saltHex, hashHex] = String(stored).split(':');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, salt, expected.length, {
      N: Number(N), r: Number(r), p: Number(p),
    });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// ---------- Sessions (jetons hachés côté serveur) ----------

const SESSION_COOKIE = 'wms_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 h

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.run(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    [tokenHash, userId, expiresAt]
  );
  return { token, expiresAt };
}

function getSessionUser(token) {
  if (!token) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const row = db.get(
    `SELECT s.token_hash, s.expires_at, u.id, u.email
       FROM sessions s JOIN admin_users u ON u.id = s.user_id
      WHERE s.token_hash = ?`,
    [tokenHash]
  );
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.run('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
    return null;
  }
  db.run('UPDATE sessions SET last_seen_at = datetime(\'now\') WHERE token_hash = ?', [tokenHash]);
  return { id: row.id, email: row.email };
}

function destroySession(token) {
  if (!token) return;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  db.run('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
}

function cleanupSessions() {
  db.run("DELETE FROM sessions WHERE expires_at < datetime('now')");
}

// ---------- Cookies (minimal, sans dépendance) ----------

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function setCookie(res, name, value, { maxAgeMs, httpOnly = true, sameSite = 'Lax' } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=/`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push('HttpOnly');
  if (maxAgeMs) parts.push(`Max-Age=${Math.floor(maxAgeMs / 1000)}`);
  if (config.isProd && process.env.COOKIE_SECURE !== 'false') parts.push('Secure');
  const prev = res.getHeader('Set-Cookie');
  const list = prev ? (Array.isArray(prev) ? prev : [prev]) : [];
  list.push(parts.join('; '));
  res.setHeader('Set-Cookie', list);
}

// ---------- CSRF (jeton par session navigateur) ----------

const CSRF_COOKIE = 'wms_csrf';

function newCsrfToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function csrfToken(req) {
  const cookies = parseCookies(req);
  if (cookies[CSRF_COOKIE]) return cookies[CSRF_COOKIE];
  return null;
}

/** Pose le cookie si nécessaire et renvoie le jeton efficace pour la requête. */
function ensureCsrfCookie(req, res) {
  const existing = csrfToken(req);
  if (existing) return existing;
  const token = newCsrfToken();
  setCookie(res, CSRF_COOKIE, token, { httpOnly: false, maxAgeMs: SESSION_TTL_MS });
  return token;
}

function verifyCsrf(req) {
  const cookies = parseCookies(req);
  const cookieToken = cookies[CSRF_COOKIE];
  const bodyToken = req.body && req.body._csrf;
  if (!cookieToken || !bodyToken) return false;
  const a = Buffer.from(String(cookieToken));
  const b = Buffer.from(String(bodyToken));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------- Limitation des tentatives de connexion ----------

const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_MINUTES = 15;

function recordLoginAttempt(email, ipHash, success) {
  db.run(
    'INSERT INTO login_attempts (email, ip_hash, success) VALUES (?, ?, ?)',
    [email.toLowerCase(), ipHash, success ? 1 : 0]
  );
}

function isLoginBlocked(email) {
  const row = db.get(
    `SELECT COUNT(*) AS n FROM login_attempts
      WHERE email = ? AND success = 0
        AND created_at > datetime('now', ?)`,
    [email.toLowerCase(), `-${LOGIN_WINDOW_MINUTES} minutes`]
  );
  return (row && row.n) >= MAX_LOGIN_ATTEMPTS;
}

function clearLoginAttempts(email) {
  db.run('DELETE FROM login_attempts WHERE email = ?', [email.toLowerCase()]);
}

// ---------- Téléphones (Burkina Faso et international) ----------

/** Normalise un numéro pour les liens wa.me : chiffres uniquement, indicatif pays. */
function normalizePhone(raw) {
  let digits = String(raw || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('00226')) digits = digits.slice(2);
  if (digits.length === 8) digits = `226${digits}`;            // numéro local BF
  if (digits.length === 10 && digits.startsWith('226')) digits = `226${digits.slice(2)}`; // déjà 226+8
  return digits;
}

function isValidPhone(raw) {
  const digits = normalizePhone(raw);
  return digits.length >= 8 && digits.length <= 15;
}

function formatPhoneBf(digits) {
  const d = normalizePhone(digits);
  if (d.startsWith('226') && d.length === 11) {
    return `+226 ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
  }
  return d ? `+${d}` : '';
}

// ---------- Validation générique ----------

function cleanText(value, { max = 500, allowNewlines = false } = {}) {
  let s = String(value ?? '').trim();
  if (!allowNewlines) {
    s = s.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ');
  } else {
    s = s.replace(/\r\n?/g, '\n').replace(/[ \t]{2,}/g, ' ');
  }
  if (s.length > max) s = s.slice(0, max);
  return s;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

/** Adresse IP du client (derrière proxy de prévisualisation). */
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function ipHash(req) {
  return crypto.createHash('sha256')
    .update(`${clientIp(req)}|${config.sessionSecret}`)
    .digest('hex')
    .slice(0, 16);
}

// ---------- Journal d'audit ----------

function audit(action, entity, entityId, details, actor = 'admin') {
  db.run(
    'INSERT INTO audit_log (action, entity, entity_id, actor, details) VALUES (?, ?, ?, ?, ?)',
    [action, String(entity || ''), String(entityId || ''), actor, String(details || '').slice(0, 1000)]
  );
}

module.exports = {
  hashPassword, verifyPassword,
  createSession, getSessionUser, destroySession, cleanupSessions,
  parseCookies, setCookie,
  csrfToken, ensureCsrfCookie, verifyCsrf,
  recordLoginAttempt, isLoginBlocked, clearLoginAttempts,
  normalizePhone, isValidPhone, formatPhoneBf,
  cleanText, isValidEmail, clientIp, ipHash, audit,
  SESSION_COOKIE, CSRF_COOKIE,
};
