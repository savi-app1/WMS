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

process.on('SIGTERM', () => {
  clearInterval(cleanupTimer);
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  clearInterval(cleanupTimer);
  server.close(() => process.exit(0));
});
