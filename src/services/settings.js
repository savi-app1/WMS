'use strict';
/**
 * Paramètres modifiables sans intervention dans le code.
 */
const db = require('../db');

function getSetting(key, fallback = '') {
  const row = db.get('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  db.run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, String(value)]
  );
}

function getDeliveryZones() {
  try {
    return JSON.parse(getSetting('delivery_zones', '{}'));
  } catch {
    return {};
  }
}

function setDeliveryZones(zones) {
  setSetting('delivery_zones', JSON.stringify(zones));
}

module.exports = { getSetting, setSetting, getDeliveryZones, setDeliveryZones };
