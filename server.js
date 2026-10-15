'use strict';
/**
 * Point d'entrée du serveur WMS.
 */
const { config, assertConfig } = require('./src/config');
const db = require('./src/db');
const { createApp } = require('./src/app');
const { ensureAdmin } = require('./src/bootstrap');

assertConfig();
db.open();
ensureAdmin();

const app = createApp();
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`[wms] Serveur démarré sur http://0.0.0.0:${config.port} (${config.env})`);
  console.log(`[wms] Base de données : ${db.dbFile()}`);
  if (config.publicUrl) console.log(`[wms] URL publique : ${config.publicUrl}`);
});

// Nettoyage périodique des sessions expirées
const cleanupTimer = setInterval(() => {
  try { require('./src/security').cleanupSessions(); } catch { /* ignore */ }
}, 60 * 60 * 1000);
cleanupTimer.unref();

// Sauvegarde automatique de la base toutes les 6 heures (dossier data/backups)
const backupTimer = setInterval(() => {
  try {
    const path = require('path');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    db.backupTo(path.join(config.root, 'data', 'backups', `wms-${stamp}.sqlite`));
  } catch (err) {
    console.error('[wms] échec sauvegarde planifiée :', err.message);
  }
}, 6 * 60 * 60 * 1000);
backupTimer.unref();

process.on('SIGTERM', () => {
  clearInterval(cleanupTimer);
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  clearInterval(cleanupTimer);
  server.close(() => process.exit(0));
});
