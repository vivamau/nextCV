const { getDb } = require('../config/db');

function replaceTorSkills(torId, skills, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM tor_skills WHERE tor_id = ?', [torId], (err) => {
      if (err) return reject(err);
      if (!skills || skills.length === 0) return resolve([]);

      const stmt = db.prepare(
        'INSERT INTO tor_skills (tor_id, skill) VALUES (?, ?)',
        (prepErr) => { if (prepErr) return reject(prepErr); }
      );

      let pending = skills.length;
      let failed = false;
      const inserted = [];

      skills.forEach((skill) => {
        const trimmed = skill.trim();
        if (!trimmed) { if (--pending === 0) { stmt.finalize(); resolve(inserted); } return; }
        stmt.run([torId, trimmed], function (runErr) {
          if (failed) return;
          if (runErr) { failed = true; return reject(runErr); }
          inserted.push(trimmed);
          if (--pending === 0) { stmt.finalize(); resolve(inserted); }
        });
      });
    });
  });
}

function getTorSkills(torId, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, skill, extracted_at FROM tor_skills WHERE tor_id = ? ORDER BY skill',
      [torId],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

function deleteTorSkills(torId, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM tor_skills WHERE tor_id = ?', [torId], function (err) {
      if (err) return reject(err);
      resolve(this.changes);
    });
  });
}

module.exports = { replaceTorSkills, getTorSkills, deleteTorSkills };
