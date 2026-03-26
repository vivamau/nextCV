const { getDb } = require('../config/db');

function createTor({ name, description, va_link, file_name, file_content }, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO tors (name, description, va_link, file_name, file_content)
       VALUES (?, ?, ?, ?, ?)`,
      [name, description || null, va_link || null, file_name || null, file_content || null],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

function getTors(db = getDb()) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, name, description, va_link, file_name, created_at, updated_at FROM tors ORDER BY created_at DESC',
      [],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

function getTorById(id, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM tors WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function updateTor(id, { name, description, va_link, file_name, file_content }, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE tors SET name = ?, description = ?, va_link = ?, file_name = ?,
       file_content = COALESCE(?, file_content), updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, description || null, va_link || null, file_name || null, file_content || null, id],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      }
    );
  });
}

function deleteTor(id, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM tors WHERE id = ?', [id], function (err) {
      if (err) return reject(err);
      resolve(this.changes);
    });
  });
}

module.exports = { createTor, getTors, getTorById, updateTor, deleteTor };
