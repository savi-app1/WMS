/**
 * Couche d'accès aux données — SQLite (module natif `node:sqlite` de Node 22).
 *
 * Choix d'architecture :
 *  - SQLite en fichier local : coût nul, sauvegarde triviale (copie du fichier),
 *    persistance garantie, aucune dépendance externe à configurer.
 *  - Les migrations sont versionnées et appliquées de façon idempotente.
 *  - Le schéma est créé/altéré ici : une seule source de vérité.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { DATA_DIR, DB_FILE } from './server-paths';

export type SqlValue = string | number | bigint | null | Uint8Array;
export type Row = Record<string, unknown>;

let dbInstance: DatabaseSync | null = null;
let applyingMigrations = false;

function openDatabase(): DatabaseSync {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA synchronous = NORMAL');
  return db;
}

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = openDatabase();
    applyMigrations(dbInstance);
  }
  return dbInstance;
}

/** Exécute une requête et renvoie toutes les lignes. */
export function query<T = Row>(sql: string, params: SqlValue[] = []): T[] {
  const stmt = getDb().prepare(sql);
  return stmt.all(...params) as T[];
}

/** Exécute une requête et renvoie la première ligne (ou undefined). */
export function queryOne<T = Row>(sql: string, params: SqlValue[] = []): T | undefined {
  const stmt = getDb().prepare(sql);
  return stmt.get(...params) as T | undefined;
}

/** Exécute une écriture et renvoie `{ changes, lastInsertRowid }`. */
export function run(sql: string, params: SqlValue[] = []): { changes: number; lastInsertRowid: number } {
  const stmt = getDb().prepare(sql);
  const result = stmt.run(...params);
  return {
    changes: Number(result.changes),
    lastInsertRowid: Number(result.lastInsertRowid),
  };
}

/** Exécute plusieurs écritures dans une transaction. */
export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* rollback best-effort */
    }
    throw error;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Migrations                                                          */
/* ------------------------------------------------------------------ */

const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: '001_core',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        last_login_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        user_agent TEXT,
        ip_hash TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

      CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identifier TEXT NOT NULL,
        ip_hash TEXT NOT NULL,
        success INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(identifier, ip_hash, created_at);

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        short_description TEXT,
        description TEXT,
        price_fcfa INTEGER,
        price_type TEXT NOT NULL DEFAULT 'unique',
        compare_price_fcfa INTEGER,
        stock INTEGER,
        track_stock INTEGER NOT NULL DEFAULT 0,
        sku TEXT,
        images TEXT NOT NULL DEFAULT '[]',
        specs TEXT NOT NULL DEFAULT '{}',
        is_digital INTEGER NOT NULL DEFAULT 0,
        is_service INTEGER NOT NULL DEFAULT 0,
        is_published INTEGER NOT NULL DEFAULT 1,
        featured INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        views INTEGER NOT NULL DEFAULT 0,
        orders_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_products_published ON products(is_published);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT NOT NULL UNIQUE,
        public_token TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        city TEXT,
        address TEXT,
        delivery_zone TEXT,
        delivery_fee_fcfa INTEGER,
        items TEXT NOT NULL DEFAULT '[]',
        subtotal_fcfa INTEGER,
        total_fcfa INTEGER,
        price_pending INTEGER NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'paiement_livraison',
        amount_paid_fcfa INTEGER,
        status TEXT NOT NULL DEFAULT 'nouvelle',
        note TEXT,
        admin_note TEXT,
        tracking_code TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_content TEXT,
        utm_term TEXT,
        is_test INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        confirmed_at TEXT,
        prepared_at TEXT,
        shipped_at TEXT,
        delivered_at TEXT,
        cancelled_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

      CREATE TABLE IF NOT EXISTS order_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        from_status TEXT,
        to_status TEXT NOT NULL,
        action TEXT,
        note TEXT,
        actor TEXT NOT NULL DEFAULT 'admin',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id);

      CREATE TABLE IF NOT EXISTS delivery_zones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        fee_fcfa INTEGER,
        active INTEGER NOT NULL DEFAULT 1,
        note TEXT
      );

      CREATE TABLE IF NOT EXISTS scripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'script_video',
        channel TEXT,
        body TEXT NOT NULL,
        notes TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        source TEXT,
        source_url TEXT,
        source_date TEXT,
        status TEXT NOT NULL DEFAULT 'brouillon',
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        objective TEXT,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        ad_copy TEXT,
        video_script TEXT,
        platform TEXT,
        product_url TEXT,
        utm TEXT NOT NULL DEFAULT '{}',
        budget_fcfa INTEGER,
        start_date TEXT,
        end_date TEXT,
        status TEXT NOT NULL DEFAULT 'brouillon',
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS research_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'tendance',
        sources TEXT NOT NULL DEFAULT '[]',
        facts TEXT,
        confidence TEXT NOT NULL DEFAULT 'a_verifier',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        path TEXT,
        product_id INTEGER,
        order_id INTEGER,
        referrer TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_content TEXT,
        utm_term TEXT,
        device TEXT,
        visitor_id TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

      CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT,
        mime TEXT NOT NULL,
        size INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        variants TEXT NOT NULL DEFAULT '{}',
        alt TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    id: '002_rate_limits',
    sql: `
      CREATE TABLE IF NOT EXISTS rate_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bucket TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_rate_limits ON rate_limits(bucket, created_at);
    `,
  },
];

export function applyMigrations(db: DatabaseSync): void {
  if (applyingMigrations) return;
  applyingMigrations = true;
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`);
    const applied = new Set(
      (db.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]).map((r) => r.id),
    );
    for (const migration of MIGRATIONS) {
      if (applied.has(migration.id)) continue;
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(
        migration.id,
        nowIso(),
      );
    }
  } finally {
    applyingMigrations = false;
  }
}

/* ------------------------------------------------------------------ */
/* Réglages (key/value)                                                */
/* ------------------------------------------------------------------ */

export function getSetting<T = string>(key: string, fallback: T): T {
  const row = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return row.value as unknown as T;
  }
}

export function setSetting(key: string, value: unknown): void {
  run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, JSON.stringify(value), nowIso()],
  );
}
