const { getDb } = require('../config/db');

function getSetting(key, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.value : null);
    });
  });
}

function setSetting(key, value, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value],
      function (err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

function getAllSettings(db = getDb()) {
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM settings', [], (err, rows) => {
      if (err) return reject(err);
      const map = {};
      rows.forEach(r => { map[r.key] = r.value; });
      resolve(map);
    });
  });
}

module.exports = { getSetting, setSetting, getAllSettings };
