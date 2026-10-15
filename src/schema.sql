-- ============================================================
-- WMS — Schéma de base de données SQLite
-- Wendmanegda Multiples Services — Ouagadougou, Burkina Faso
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Catégories de produits (modifiables sans toucher au code)
CREATE TABLE IF NOT EXISTS categories (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Produits et services
CREATE TABLE IF NOT EXISTS products (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  category          TEXT NOT NULL REFERENCES categories(slug),
  short_description TEXT NOT NULL DEFAULT '',
  description       TEXT NOT NULL DEFAULT '',
  characteristics   TEXT NOT NULL DEFAULT '',   -- champs à compléter par l'admin
  price_fcfa        INTEGER,                    -- NULL = prix à confirmer (jamais inventé)
  stock_enabled     INTEGER NOT NULL DEFAULT 0,
  stock_qty         INTEGER,                    -- NULL = non suivi
  image_url         TEXT,
  active            INTEGER NOT NULL DEFAULT 1,
  is_demo           INTEGER NOT NULL DEFAULT 0, -- données de démonstration identifiées
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- Commandes
CREATE TABLE IF NOT EXISTS orders (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number      TEXT NOT NULL UNIQUE,
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,              -- format normalisé
  customer_phone_raw TEXT NOT NULL,             -- tel que saisi par le client
  customer_address  TEXT NOT NULL,
  customer_zone     TEXT NOT NULL DEFAULT '',
  customer_notes    TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'nouvelle'
                    CHECK (status IN ('nouvelle','a_confirmer','confirmee','en_preparation','en_livraison','livree','annulee')),
  payment_method    TEXT NOT NULL DEFAULT 'livraison', -- 'livraison' (paiement à la livraison)
  delivery_fee_fcfa INTEGER,                    -- NULL = frais à confirmer
  amount_ordered    INTEGER,                    -- montant commandé (NULL si prix incomplets)
  amount_confirmed  INTEGER,                    -- montant confirmé (action admin)
  amount_delivered  INTEGER,                    -- montant livré (action admin « Colis livré »)
  amount_cashed     INTEGER,                    -- montant réellement encaissé (saisie manuelle)
  prices_incomplete INTEGER NOT NULL DEFAULT 0,
  is_demo           INTEGER NOT NULL DEFAULT 0,
  utm_source        TEXT NOT NULL DEFAULT '',
  utm_medium        TEXT NOT NULL DEFAULT '',
  utm_campaign      TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at      TEXT,
  delivered_at      TEXT,
  cancelled_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- Lignes de commande (instantané du produit au moment de la commande)
CREATE TABLE IF NOT EXISTS order_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id       INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name   TEXT NOT NULL,
  unit_price_fcfa INTEGER,                     -- NULL = prix à confirmer
  quantity       INTEGER NOT NULL CHECK (quantity > 0),
  line_total     INTEGER                       -- NULL si prix inconnu
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Historique des changements de statut
CREATE TABLE IF NOT EXISTS order_status_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  actor       TEXT NOT NULL DEFAULT 'admin',
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_history_order ON order_status_history(order_id);

-- Compte administrateur unique (aucune inscription publique)
CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT CHECK (id = 1),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,                  -- scrypt: sel:hash
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- Sessions serveur (jeton haché)
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Tentatives de connexion (limitation de débit persistante)
CREATE TABLE IF NOT EXISTS login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL,
  ip_hash    TEXT NOT NULL,
  success    INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(email, created_at);

-- Événements analytiques internes (trafic réel, jamais inventé)
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,   -- page_view | product_view | whatsapp_click | order_start | order_placed | search
  path        TEXT NOT NULL DEFAULT '',
  product_id  INTEGER,
  detail      TEXT NOT NULL DEFAULT '',
  utm_source  TEXT NOT NULL DEFAULT '',
  utm_medium  TEXT NOT NULL DEFAULT '',
  utm_campaign TEXT NOT NULL DEFAULT '',
  referrer    TEXT NOT NULL DEFAULT '',
  ip_hash     TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

-- Bibliothèque « Scripts et contenus WMS »
CREATE TABLE IF NOT EXISTS scripts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'script_video'
              CHECK (type IN ('script_video','voix_off','publication','dialogue','accroche','faq','autre')),
  category    TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  tags        TEXT NOT NULL DEFAULT '',
  source_note TEXT NOT NULL DEFAULT '',        -- origine / date quand connue
  status      TEXT NOT NULL DEFAULT 'brouillon'
              CHECK (status IN ('brouillon','valide','archive')),
  is_demo     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Préparation de campagnes publicitaires
CREATE TABLE IF NOT EXISTS campaigns (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  objective      TEXT NOT NULL DEFAULT '',
  product_service TEXT NOT NULL DEFAULT '',
  ad_text        TEXT NOT NULL DEFAULT '',
  script_id      INTEGER REFERENCES scripts(id) ON DELETE SET NULL,
  platform       TEXT NOT NULL DEFAULT '',      -- Facebook, TikTok, WhatsApp, autre
  product_link   TEXT NOT NULL DEFAULT '',
  utm_string     TEXT NOT NULL DEFAULT '',
  budget_fcfa    INTEGER,
  start_date     TEXT,
  end_date       TEXT,
  status         TEXT NOT NULL DEFAULT 'brouillon'
                 CHECK (status IN ('brouillon','pret','en_cours','termine')),
  notes          TEXT NOT NULL DEFAULT '',
  is_demo        INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Paramètres modifiables sans code
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Journal d'audit des actions importantes
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL DEFAULT '',
  entity_id  TEXT NOT NULL DEFAULT '',
  actor      TEXT NOT NULL DEFAULT 'admin',
  details    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
