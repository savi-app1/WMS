'use strict';
/* Tests unitaires — sécurité (mots de passe, sessions, CSRF, téléphones). */
process.env.DATABASE_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret-' + 'a'.repeat(32);
process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert');
const db = require('../src/db');
const security = require('../src/security');

db.open(':memory:');

test('hachage mot de passe : scrypt + vérification', () => {
  const hash = security.hashPassword('MonMotDePasseTresFort123!');
  assert.match(hash, /^scrypt:/);
  assert.strictEqual(security.verifyPassword('MonMotDePasseTresFort123!', hash), true);
  assert.strictEqual(security.verifyPassword('mauvais', hash), false);
  assert.strictEqual(security.verifyPassword('', hash), false);
  assert.strictEqual(security.verifyPassword('x'.repeat(10), 'corrompu'), false);
  // deux hachages différents pour le même mot de passe (sel aléatoire)
  assert.notStrictEqual(security.hashPassword('MonMotDePasseTresFort123!'), hash);
});

test('normalisation téléphones Burkinabè', () => {
  assert.strictEqual(security.normalizePhone('+226 70 00 13 17'), '22670001317');
  assert.strictEqual(security.normalizePhone('70 00 13 17'), '22670001317');
  assert.strictEqual(security.normalizePhone('00226 56 59 25 57'), '22656592557');
  assert.strictEqual(security.normalizePhone('+33 6 12 34 56 78'), '33612345678');
  assert.ok(security.isValidPhone('70 00 13 17'));
  assert.ok(security.isValidPhone('+226 56 59 25 57'));
  assert.ok(!security.isValidPhone('123'));
  assert.ok(!security.isValidPhone(''));
});

test('sessions : création, lecture, expiration, destruction', () => {
  db.run('INSERT INTO admin_users (id, email, password_hash) VALUES (1, ?, ?)', ['t@t.bf', 'x']);
  const { token } = security.createSession(1);
  const user = security.getSessionUser(token);
  assert.strictEqual(user.email, 't@t.bf');
  // jeton entropique ≥ 32 octets encodés
  assert.ok(token.length >= 40);
  // un jeton presque identique ne doit pas fonctionner
  assert.strictEqual(security.getSessionUser(token.slice(0, -2) + (token.endsWith('a') ? 'b' : 'a')), null);
  security.destroySession(token);
  assert.strictEqual(security.getSessionUser(token), null);
  // expiration forcée
  const s2 = security.createSession(1);
  db.run('UPDATE sessions SET expires_at = datetime(\'now\', \'-1 hour\')');
  assert.strictEqual(security.getSessionUser(s2.token), null);
});

test('limitation des tentatives de connexion', () => {
  const email = 'admin@test.bf';
  for (let i = 0; i < 8; i += 1) security.recordLoginAttempt(email, 'iphash', false);
  assert.strictEqual(security.isLoginBlocked(email), true);
  security.clearLoginAttempts(email);
  assert.strictEqual(security.isLoginBlocked(email), false);
  // les succès ne bloquent pas
  security.recordLoginAttempt(email, 'iphash', true);
  assert.strictEqual(security.isLoginBlocked(email), false);
});

test('validation texte & e-mail', () => {
  assert.strictEqual(security.cleanText('  a\n\n b  ', { max: 10 }), 'a b');
  assert.strictEqual(security.cleanText('abc', { max: 2 }), 'ab');
  assert.strictEqual(security.cleanText('ligne1\r\nligne2', { allowNewlines: true }), 'ligne1\nligne2');
  assert.ok(security.isValidEmail('a@b.bf'));
  assert.ok(!security.isValidEmail('a@b'));
  assert.ok(!security.isValidEmail('abc'));
});

test('audit log : écriture', () => {
  security.audit('test_action', 'tests', 1, 'détail test');
  const row = db.get('SELECT * FROM audit_log ORDER BY id DESC LIMIT 1');
  assert.strictEqual(row.action, 'test_action');
  assert.strictEqual(row.entity, 'tests');
  assert.strictEqual(row.details, 'détail test');
});
