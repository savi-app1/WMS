'use strict';
/**
 * Sauvegarde de la base SQLite (copie cohérente via VACUUM INTO).
 * Usage : node scripts/backup.js
 * Recommandé : tâche planifiée quotidienne (cron) avec conservation de 30 jours.
 */
const path = require('path');
const fs = require('fs');
process.chdir(path.join(__dirname, '..'));

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'backup-script-only-' + 'x'.repeat(32);
const db = require('../src/db');

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dest = path.join(__dirname, '..', 'backups', `wms-${stamp}.sqlite`);

db.open();
db.backupTo(dest);
console.log(`✔ Sauvegarde : ${dest} (${Math.round(fs.statSync(dest).size / 1024)} Ko)`);

// Rotation : conserver les 30 dernières sauvegardes
const dir = path.dirname(dest);
const files = fs.readdirSync(dir).filter((f) => f.startsWith('wms-') && f.endsWith('.sqlite')).sort();
const extra = files.length - 30;
for (let i = 0; i < extra; i += 1) {
  fs.unlinkSync(path.join(dir, files[i]));
  console.log(`  (rotation : ${files[i]} supprimée)`);
}
