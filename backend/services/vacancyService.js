const { getDb } = require('../config/db');
const { getSkillOverlap } = require('../utilities/skillMatcher');

function createVacancy({ title, description, tor_id, opened_at, closed_at }, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO vacancies (title, description, tor_id, opened_at, closed_at)
       VALUES (?, ?, ?, ?, ?)`,
      [title, description || null, tor_id || null, opened_at || null, closed_at || null],
      function (err) { if (err) return reject(err); resolve(this.lastID); }
    );
  });
}

function getVacancies(db = getDb()) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT v.*, t.name as tor_name
       FROM vacancies v LEFT JOIN tors t ON t.id = v.tor_id
       ORDER BY v.created_at DESC`,
      [],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

function getVacancyById(id, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT v.*, t.name as tor_name,
       (SELECT SUM(COALESCE(weight, 3)) FROM tor_skills WHERE tor_id = v.tor_id) as total_potential_score
       FROM vacancies v LEFT JOIN tors t ON t.id = v.tor_id
       WHERE v.id = ?`,
      [id],
      (err, row) => (err ? reject(err) : resolve(row || null))
    );
  });
}

function updateVacancy(id, { title, description, tor_id, opened_at, closed_at }, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE vacancies SET title=?, description=?, tor_id=?, opened_at=?, closed_at=?
       WHERE id=?`,
      [title, description || null, tor_id || null, opened_at || null, closed_at || null, id],
      function (err) { if (err) return reject(err); resolve(this.changes); }
    );
  });
}

function deleteVacancy(id, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM vacancies WHERE id=?', [id],
      function (err) { if (err) return reject(err); resolve(this.changes); }
    );
  });
}

// --- candidates_to_vacancies ---
function addCandidateToVacancy(candidateId, vacancyId, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR IGNORE INTO candidates_to_vacancies (candidate_id, vacancy_id) VALUES (?,?)',
      [candidateId, vacancyId],
      function (err) { if (err) return reject(err); resolve(this.lastID); }
    );
  });
}

function removeCandidateFromVacancy(candidateId, vacancyId, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM candidates_to_vacancies WHERE candidate_id=? AND vacancy_id=?',
      [candidateId, vacancyId],
      function (err) { if (err) return reject(err); resolve(this.changes); }
    );
  });
}

function getCandidatesForVacancy(vacancyId, db = getDb()) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Get the vacancy to know its tor_id
      const vacancy = await new Promise((res, rej) => {
        db.get('SELECT tor_id FROM vacancies WHERE id = ?', [vacancyId], (err, row) => err ? rej(err) : res(row));
      });
      if (!vacancy) return resolve([]);

      // 2. Get all candidates linked to this vacancy
      const candidates = await new Promise((res, rej) => {
        db.all(
          `SELECT c.*, ctv.added_at
           FROM candidates c
           JOIN candidates_to_vacancies ctv ON ctv.candidate_id = c.id
           WHERE ctv.vacancy_id = ?`,
          [vacancyId],
          (err, rows) => err ? rej(err) : res(rows)
        );
      });
      if (!candidates.length) return resolve([]);

      // 3. Get TOR skills and weights
      const torSkillsData = !vacancy.tor_id ? [] : await new Promise((res, rej) => {
        db.all('SELECT skill, weight FROM tor_skills WHERE tor_id = ?', [vacancy.tor_id], (err, rows) => 
          err ? rej(err) : res(rows)
        );
      });
      const torSkillNames = torSkillsData.map(r => r.skill);
      const weightMap = torSkillsData.reduce((acc, r) => {
        acc[r.skill.toLowerCase().trim()] = r.weight || 3;
        return acc;
      }, {});

      // 4. Get all candidate skills for these candidates in one go
      const candIds = candidates.map(c => c.id);
      const allCandSkills = await new Promise((res, rej) => {
        const placeholders = candIds.map(() => '?').join(',');
        db.all(`SELECT candidate_id, skill FROM candidate_skills WHERE candidate_id IN (${placeholders})`, candIds, (err, rows) =>
          err ? rej(err) : res(rows)
        );
      });

      // 5. Group skills by candidate
      const skillsByCand = allCandSkills.reduce((acc, row) => {
        if (!acc[row.candidate_id]) acc[row.candidate_id] = [];
        acc[row.candidate_id].push(row.skill);
        return acc;
      }, {});

      // 6. Compute overlap and weighted score
      const augmented = candidates.map(c => {
        const cSkills = skillsByCand[c.id] || [];
        const matched = getSkillOverlap(cSkills, torSkillNames);
        
        // Calculate weighted score sum
        const weightedScore = matched.reduce((sum, s) => {
          return sum + (weightMap[s.toLowerCase().trim()] || 0);
        }, 0);

        return {
          ...c,
          skill_match_count: matched.length,
          matched_skills: matched.join(', '),
          weighted_score: weightedScore
        };
      });

      // 7. Sort by weighted_score (primary) then count (secondary)
      augmented.sort((a, b) => {
        if (b.weighted_score !== a.weighted_score) return b.weighted_score - a.weighted_score;
        if (b.skill_match_count !== a.skill_match_count) return b.skill_match_count - a.skill_match_count;
        const nameA = a.job_application || '';
        const nameB = b.job_application || '';
        return nameA.localeCompare(nameB);
      });

      resolve(augmented);
    } catch (err) {
      reject(err);
    }
  });
}

function getVacanciesForCandidate(candidateId, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT v.*, ctv.added_at FROM vacancies v
       JOIN candidates_to_vacancies ctv ON ctv.vacancy_id = v.id
       WHERE ctv.candidate_id = ? ORDER BY v.created_at DESC`,
      [candidateId],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

function addAllCandidatesToVacancy(vacancyId, db = getDb()) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO candidates_to_vacancies (candidate_id, vacancy_id)
       SELECT id, ? FROM candidates`,
      [vacancyId],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      }
    );
  });
}

module.exports = {
  createVacancy, getVacancies, getVacancyById, updateVacancy, deleteVacancy,
  addCandidateToVacancy, removeCandidateFromVacancy,
  getCandidatesForVacancy, getVacanciesForCandidate,
  addAllCandidatesToVacancy,
};
