'use strict';
/**
 * Initialisation : compte administrateur unique + catégories par défaut.
 * Aucune inscription publique : l'admin est créé depuis les variables d'environnement.
 */
const db = require('./db');
const security = require('./security');
const { config } = require('./config');

const DEFAULT_CATEGORIES = [
  { slug: 'smartphones-accessoires', name: 'Smartphones et accessoires', sort: 1 },
  { slug: 'audio-bluetooth', name: 'Écouteurs, casques et appareils Bluetooth', sort: 2 },
  { slug: 'montres-connectees', name: 'Montres connectées et bracelets', sort: 3 },
  { slug: 'energie', name: 'Chargeurs, câbles et batteries externes', sort: 4 },
  { slug: 'stockage', name: 'Clés USB et cartes mémoire', sort: 5 },
  { slug: 'tv-electronique', name: 'Téléviseurs et appareils électroniques', sort: 6 },
  { slug: 'divers', name: 'Accessoires et objets divers', sort: 7 },
  { slug: 'numerique-pdf', name: 'Produits numériques et livres PDF', sort: 8 },
  { slug: 'formations', name: 'Formations et services digitaux', sort: 9 },
  { slug: 'autres', name: 'Autres produits', sort: 10 },
];

function ensureCategories() {
  for (const c of DEFAULT_CATEGORIES) {
    db.run(
      'INSERT INTO categories (slug, name, sort_order) VALUES (?, ?, ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name',
      [c.slug, c.name, c.sort]
    );
  }
}

function ensureAdmin() {
  ensureCategories();

  const existing = db.get('SELECT id, email FROM admin_users WHERE id = 1');
  if (existing) return existing;

  // Aucun compte : création à partir de ADMIN_PASSWORD, sinon mot de passe
  // aléatoire affiché UNE FOIS dans les journaux (jamais de mot de passe en dur).
  let password = config.adminPassword;
  if (!password || password.startsWith('remplacer-')) {
    const crypto = require('crypto');
    password = `Wms@${crypto.randomBytes(9).toString('base64url')}`;
    console.warn('⚠️  [bootstrap] Aucun ADMIN_PASSWORD fourni.');
    console.warn(`⚠️  [bootstrap] Mot de passe admin TEMPORAIRE généré : ${password}`);
    console.warn('⚠️  [bootstrap] Renseignez ADMIN_PASSWORD dans .env ou changez ce mot de passe après connexion (Paramètres).');
  }

  const hash = security.hashPassword(password);
  db.run('INSERT INTO admin_users (id, email, password_hash) VALUES (1, ?, ?)', [config.adminEmail, hash]);
  security.audit('admin_created', 'admin_users', 1, `Compte administrateur ${config.adminEmail} créé.`);
  console.log(`[bootstrap] Compte administrateur créé : ${config.adminEmail}`);
  return { id: 1, email: config.adminEmail };
}

module.exports = { ensureAdmin, ensureCategories, DEFAULT_CATEGORIES };
