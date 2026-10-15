'use strict';
/**
 * Configuration WMS — lecture des variables d'environnement.
 * Aucun secret n'est codé en dur : tout vient de .env / de l'environnement.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/** Charge .env (sans écraser les variables déjà présentes). */
function loadEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

function bool(v, def = false) {
  if (v === undefined || v === '') return def;
  return ['1', 'true', 'yes', 'oui'].includes(String(v).toLowerCase());
}

function parseJson(v, def) {
  if (!v) return def;
  try {
    return JSON.parse(v);
  } catch {
    return def;
  }
}

const config = {
  root: ROOT,
  env: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  port: Number(process.env.PORT || 3000),
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/+$/, ''),
  sessionSecret: process.env.SESSION_SECRET || '',
  databasePath: process.env.DATABASE_PATH || 'data/wms.sqlite',
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@wms.bf').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  whatsappNumber: (process.env.WHATSAPP_NUMBER || '22656592557').replace(/[^0-9]/g, ''),
  contactPhone: process.env.CONTACT_PHONE || '+226 56 59 25 57',
  contactPhoneAlt: process.env.CONTACT_PHONE_ALT || '+226 79 00 13 17',
  deliveryZones: parseJson(process.env.DELIVERY_ZONES, {}),
  ga4MeasurementId: process.env.GA4_MEASUREMENT_ID || '',
  uploadDir: path.join(ROOT, 'public', 'uploads'),
  maxUploadBytes: 2 * 1024 * 1024,
};

/** Valide la configuration critique au démarrage. */
function assertConfig() {
  const problems = [];
  let sessionSecretWarning = false;
  if (!config.sessionSecret || config.sessionSecret.length < 32) {
    // Secret aléatoire de secours : démarre, mais les sessions seront
    // invalidées à chaque redémarrage. Avertir fortement.
    const crypto = require('crypto');
    config.sessionSecret = crypto.randomBytes(32).toString('hex');
    sessionSecretWarning = true;
  }
  if (sessionSecretWarning) {
    console.warn('⚠️  [config] SESSION_SECRET manquant : secret temporaire généré (sessions invalidées à chaque redémarrage). Renseignez-le dans .env.');
  }
  if (problems.length) {
    for (const p of problems) console.error('[config] ERREUR:', p);
    process.exit(1);
  }
}

module.exports = { config, assertConfig, loadEnvFile };
