'use strict';
/**
 * Couche d'accès aux données — SQLite via node:sqlite (natif Node >= 22.5).
 */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { config } = require('./config');

let db = null;

function dbFile() {
  return path.isAbsolute(config.databasePath)
    ? config.databasePath
    : path.join(config.root, config.databasePath);
}

function open(databasePath) {
  const file = databasePath || dbFile();
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  return db;
}

function getDb() {
  if (!db) open();
  return db;
}

function close() {
  if (db) {
    try { db.close(); } catch { /* déjà fermé */ }
    db = null;
  }
}

/** Exécute une requête SELECT et renvoie toutes les lignes. */
function all(sql, params = []) {
  return getDb().prepare(sql).all(...params).map((r) => ({ ...r }));
}

/** Première ligne ou undefined. */
function get(sql, params = []) {
  const row = getDb().prepare(sql).get(...params);
  return row ? { ...row } : undefined;
}

/** INSERT/UPDATE/DELETE. */
function run(sql, params = []) {
  return getDb().prepare(sql).run(...params);
}

/** Transactions. */
function transaction(fn) {
  const d = getDb();
  d.exec('BEGIN');
  try {
    const result = fn();
    d.exec('COMMIT');
    return result;
  } catch (err) {
    try { d.exec('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  }
}

/** Paramètre LIKE échappé. */
function likeParam(q) {
  return `%${String(q).replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}

/** Copie de sauvegarde cohérente du fichier de base. */
function backupTo(destFile) {
  const d = getDb();
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  // VACUUM INTO produit une copie cohérente même en cas d'écriture concurrente.
  d.exec(`VACUUM INTO '${destFile.replace(/'/g, "''")}'`);
  return destFile;
}

module.exports = { open, close, getDb, all, get, run, transaction, likeParam, backupTo, dbFile };
