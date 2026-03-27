const { getDb } = require('../config/db');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

const SORTABLE_COLS = new Set([
  'job_application', 'type', 'nationality', 'gender', 'age',
  'skills_match_score', 'mau_vote', 'luke_vote', 'wfp_jobs_applied',
]);

function runMigrations(db = getDb()) {
  return new Promise((resolve, reject) => {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();
    const runNext = (i) => {
      if (i >= files.length) return resolve();
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, files[i]), 'utf8');
      db.exec(sql, (err) => {
        if (err && !err.message.includes('duplicate column name')) return reject(err);
        runNext(i + 1);
      });
    };
    runNext(0);
  });
}

function insertCandidate(candidate, db = getDb()) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO candidates
      (job_application, type, wfp_jobs_applied, skills_match_score, nationality,
       gender, age, language_skill, mau_vote, mau_comments, luke_vote, luke_comments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [
      candidate.job_application, candidate.type, candidate.wfp_jobs_applied,
      candidate.skills_match_score, candidate.nationality, candidate.gender,
      candidate.age, candidate.language_skill, candidate.mau_vote,
      candidate.mau_comments, candidate.luke_vote, candidate.luke_comments,
    ], function (err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });
}

function upsertResume(candidateId, resumeText, db = getDb()) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO candidate_resumes (candidate_id, resume_text)
      VALUES (?, ?)
      ON CONFLICT(candidate_id) DO UPDATE SET resume_text = excluded.resume_text`;
    db.run(sql, [candidateId, resumeText], function (err) {
      if (err) return reject(err);
      resolve(this.lastID || candidateId);
    });
  });
}

function insertSkills(candidateId, skills, db = getDb()) {
  return new Promise((resolve, reject) => {
    if (!skills || skills.length === 0) return resolve();
    db.run('DELETE FROM candidate_skills WHERE candidate_id = ?', [candidateId], (err) => {
      if (err) return reject(err);
      const stmt = db.prepare(
        'INSERT INTO candidate_skills (candidate_id, skill) VALUES (?, ?)',
        (prepErr) => { if (prepErr) return reject(prepErr); }
      );
      let pending = skills.length;
      let failed = false;
      skills.forEach((skill) => {
        stmt.run([candidateId, skill.trim()], (runErr) => {
          if (failed) return;
          if (runErr) { failed = true; return reject(runErr); }
          if (--pending === 0) { stmt.finalize(); resolve(); }
        });
      });
    });
  });
}

function getResumeByCandidate(candidateId, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM candidate_resumes WHERE candidate_id = ?', [candidateId], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function getSkillsByCandidate(candidateId, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.all('SELECT skill FROM candidate_skills WHERE candidate_id = ? ORDER BY skill', [candidateId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(r => r.skill));
    });
  });
}

function getCandidates(
  { search, nationality, gender, mau_vote, luke_vote, page = 1, limit = 20, sort_by = 'id', sort_dir = 'asc' } = {},
  db = getDb()
) {
  return new Promise((resolve, reject) => {
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(job_application LIKE ? OR language_skill LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (nationality) { conditions.push('nationality = ?'); params.push(nationality); }
    if (gender)      { conditions.push('gender = ?');      params.push(gender); }
    if (mau_vote)    { conditions.push('mau_vote = ?');    params.push(mau_vote); }
    if (luke_vote)   { conditions.push('luke_vote = ?');   params.push(luke_vote); }

    const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    const col    = SORTABLE_COLS.has(sort_by) ? sort_by : 'id';
    const dir    = sort_dir === 'desc' ? 'DESC' : 'ASC';

    db.get(`SELECT COUNT(*) as total FROM candidates ${where}`, params, (err, row) => {
      if (err) return reject(err);
      db.all(
        `SELECT * FROM candidates ${where} ORDER BY ${col} ${dir} LIMIT ? OFFSET ?`,
        [...params, limit, offset],
        (err2, rows) => {
          if (err2) return reject(err2);
          resolve({ total: row.total, page: Number(page), limit: Number(limit), data: rows });
        }
      );
    });
  });
}

function getCandidateById(id, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM candidates WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function getStats(db = getDb()) {
  return new Promise((resolve, reject) => {
    const queries = [
      db.get.bind(db, 'SELECT COUNT(*) as total FROM candidates'),
      db.all.bind(db, 'SELECT nationality, COUNT(*) as count FROM candidates GROUP BY nationality ORDER BY count DESC LIMIT 10'),
      db.all.bind(db, 'SELECT gender, COUNT(*) as count FROM candidates GROUP BY gender'),
      db.all.bind(db, 'SELECT mau_vote, COUNT(*) as count FROM candidates GROUP BY mau_vote'),
      db.all.bind(db, 'SELECT luke_vote, COUNT(*) as count FROM candidates GROUP BY luke_vote'),
      db.all.bind(db, 'SELECT type, COUNT(*) as count FROM candidates GROUP BY type'),
    ];
    Promise.all(queries.map(q => new Promise((res, rej) => q((e, r) => e ? rej(e) : res(r)))))
      .then(([total, nationalities, genders, mauVotes, lukeVotes, types]) =>
        resolve({ total: total.total, nationalities, genders, mauVotes, lukeVotes, types })
      )
      .catch(reject);
  });
}

function clearCandidates(db = getDb()) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM candidates', (err) => (err ? reject(err) : resolve()));
  });
}

function getAllCandidatesForIndexing(db = getDb()) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT c.id, cr.resume_text, GROUP_CONCAT(cs.skill) as skills
       FROM candidates c
       JOIN candidate_resumes cr ON cr.candidate_id = c.id
       LEFT JOIN candidate_skills cs ON cs.candidate_id = c.id
       WHERE cr.resume_text IS NOT NULL AND cr.resume_text != ''
       GROUP BY c.id`,
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

function getAllTorsForIndexing(db = getDb()) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT t.id, t.file_content, GROUP_CONCAT(ts.skill) as skills
       FROM tors t
       LEFT JOIN tor_skills ts ON ts.tor_id = t.id
       WHERE t.file_content IS NOT NULL AND t.file_content != ''
       GROUP BY t.id`,
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

module.exports = {
  runMigrations, insertCandidate, upsertResume, insertSkills,
  getResumeByCandidate, getSkillsByCandidate,
  getCandidates, getCandidateById, getStats, clearCandidates,
  getAllCandidatesForIndexing, getAllTorsForIndexing,
};
