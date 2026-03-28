const sqlite3 = require('sqlite3').verbose();
const {
  runMigrations, insertCandidate, upsertResume, insertSkills,
  getResumeByCandidate, getSkillsByCandidate,
  getCandidates, getCandidateById, getStats, clearCandidates,
} = require('../services/dbService');

function makeDb() { return new sqlite3.Database(':memory:'); }

const SAMPLE = {
  job_application: 'Alice Smith (C100001)',
  type: 'External',
  wfp_jobs_applied: 2,
  skills_match_score: 'Good',
  nationality: 'Kenya',
  gender: 'Female',
  age: 30,
  language_skill: 'English',
  mau_vote: 'Yes',
  mau_comments: 'Strong profile',
  luke_vote: 'Maybe',
  luke_comments: null,
};

// --- runMigrations ---
describe('runMigrations', () => {
  test('creates candidates table', async () => {
    const db = makeDb();
    await runMigrations(db);
    const row = await new Promise((res, rej) =>
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='candidates'", (e, r) => e ? rej(e) : res(r))
    );
    expect(row.name).toBe('candidates');
    db.close();
  });

  test('creates candidate_resumes table', async () => {
    const db = makeDb();
    await runMigrations(db);
    const row = await new Promise((res, rej) =>
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='candidate_resumes'", (e, r) => e ? rej(e) : res(r))
    );
    expect(row.name).toBe('candidate_resumes');
    db.close();
  });

  test('creates candidate_skills table', async () => {
    const db = makeDb();
    await runMigrations(db);
    const row = await new Promise((res, rej) =>
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='candidate_skills'", (e, r) => e ? rej(e) : res(r))
    );
    expect(row.name).toBe('candidate_skills');
    db.close();
  });

  test('is idempotent', async () => {
    const db = makeDb();
    await runMigrations(db);
    await expect(runMigrations(db)).resolves.toBeUndefined();
    db.close();
  });
});

// --- insertCandidate ---
describe('insertCandidate', () => {
  let db;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); });
  afterEach(() => db.close());

  test('returns a numeric id', async () => {
    const id = await insertCandidate(SAMPLE, db);
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  test('persists all fields', async () => {
    const id = await insertCandidate(SAMPLE, db);
    const row = await getCandidateById(id, db);
    expect(row.job_application).toBe(SAMPLE.job_application);
    expect(row.nationality).toBe(SAMPLE.nationality);
    expect(row.mau_vote).toBe(SAMPLE.mau_vote);
  });
});

// --- upsertResume ---
describe('upsertResume', () => {
  let db, candidateId;
  beforeEach(async () => {
    db = makeDb();
    await runMigrations(db);
    candidateId = await insertCandidate(SAMPLE, db);
  });
  afterEach(() => db.close());

  test('inserts resume text', async () => {
    await upsertResume(candidateId, 'My resume text', db);
    const row = await getResumeByCandidate(candidateId, db);
    expect(row.resume_text).toBe('My resume text');
    expect(row.candidate_id).toBe(candidateId);
  });

  test('updates resume text on conflict', async () => {
    await upsertResume(candidateId, 'First version', db);
    await upsertResume(candidateId, 'Updated version', db);
    const row = await getResumeByCandidate(candidateId, db);
    expect(row.resume_text).toBe('Updated version');
  });
});

// --- insertSkills ---
describe('insertSkills', () => {
  let db, candidateId;
  beforeEach(async () => {
    db = makeDb();
    await runMigrations(db);
    candidateId = await insertCandidate(SAMPLE, db);
  });
  afterEach(() => db.close());

  test('inserts multiple skills', async () => {
    await insertSkills(candidateId, ['Python', 'SQL', 'Communication'], false, db);
    const skills = await getSkillsByCandidate(candidateId, db);
    expect(skills).toHaveLength(3);
    expect(skills.map(s => s.skill)).toContain('Python');
    expect(skills.map(s => s.skill)).toContain('SQL');
    expect(skills.every(s => s.llmExtracted === false)).toBe(true);
  });

  test('inserts skills with llm_extracted flag', async () => {
    await insertSkills(candidateId, ['Python', 'SQL'], true, db);
    const skills = await getSkillsByCandidate(candidateId, db);
    expect(skills).toHaveLength(2);
    expect(skills.every(s => s.llmExtracted === true)).toBe(true);
  });

  test('replaces skills on re-import', async () => {
    await insertSkills(candidateId, ['Python', 'SQL'], false, db);
    await insertSkills(candidateId, ['Java'], false, db);
    const skills = await getSkillsByCandidate(candidateId, db);
    expect(skills).toHaveLength(1);
    expect(skills[0].skill).toBe('Java');
  });

  test('handles empty skills array gracefully', async () => {
    await expect(insertSkills(candidateId, [], false, db)).resolves.toBeUndefined();
    const skills = await getSkillsByCandidate(candidateId, db);
    expect(skills).toHaveLength(0);
  });

  test('handles null skills gracefully', async () => {
    await expect(insertSkills(candidateId, null, false, db)).resolves.toBeUndefined();
  });

  test('rejects when prepare fails (closed db after delete)', async () => {
    // Force prepare to fail by closing db mid-operation
    const badDb = makeDb();
    await runMigrations(badDb);
    const id = await insertCandidate(SAMPLE, badDb);
    // Monkey-patch prepare to simulate error
    const orig = badDb.prepare.bind(badDb);
    badDb.prepare = (sql, cb) => { cb(new Error('prepare failed')); return { run: () => {}, finalize: () => {} }; };
    await expect(insertSkills(id, ['Python'], false, badDb)).rejects.toThrow('prepare failed');
    badDb.prepare = orig;
    badDb.close();
  });
});

// --- getResumeByCandidate ---
describe('getResumeByCandidate', () => {
  let db, candidateId;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); candidateId = await insertCandidate(SAMPLE, db); });
  afterEach(() => db.close());

  test('returns null when no resume', async () => {
    const row = await getResumeByCandidate(candidateId, db);
    expect(row).toBeNull();
  });

  test('returns resume after insert', async () => {
    await upsertResume(candidateId, 'text', db);
    const row = await getResumeByCandidate(candidateId, db);
    expect(row).not.toBeNull();
  });
});

// --- getSkillsByCandidate ---
describe('getSkillsByCandidate', () => {
  let db, candidateId;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); candidateId = await insertCandidate(SAMPLE, db); });
  afterEach(() => db.close());

  test('returns empty array when no skills', async () => {
    const skills = await getSkillsByCandidate(candidateId, db);
    expect(skills).toEqual([]);
  });

  test('returns sorted skills', async () => {
    await insertSkills(candidateId, ['Zebra', 'Apple', 'Mango'], false, db);
    const skills = await getSkillsByCandidate(candidateId, db);
    expect(skills[0].skill).toBe('Apple');
    expect(skills[2].skill).toBe('Zebra');
  });
});

// --- getCandidates ---
describe('getCandidates', () => {
  let db;
  beforeEach(async () => {
    db = makeDb();
    await runMigrations(db);
    await insertCandidate(SAMPLE, db);
    await insertCandidate({ ...SAMPLE, job_application: 'Bob Jones (C100002)', gender: 'Male', nationality: 'Nigeria', mau_vote: 'No', luke_vote: 'Yes', age: 40 }, db);
  });
  afterEach(() => db.close());

  test('returns all candidates with total', async () => {
    const result = await getCandidates({}, db);
    expect(result.total).toBe(2);
    expect(result.data).toHaveLength(2);
  });

  test('filters by gender', async () => {
    const result = await getCandidates({ gender: 'Female' }, db);
    expect(result.total).toBe(1);
  });

  test('filters by nationality', async () => {
    const result = await getCandidates({ nationality: 'Nigeria' }, db);
    expect(result.total).toBe(1);
  });

  test('filters by mau_vote', async () => {
    const result = await getCandidates({ mau_vote: 'Yes' }, db);
    expect(result.total).toBe(1);
  });

  test('filters by luke_vote', async () => {
    const result = await getCandidates({ luke_vote: 'Yes' }, db);
    expect(result.total).toBe(1);
  });

  test('search by name', async () => {
    const result = await getCandidates({ search: 'Alice' }, db);
    expect(result.total).toBe(1);
  });

  test('pagination', async () => {
    const result = await getCandidates({ page: 2, limit: 1 }, db);
    expect(result.data).toHaveLength(1);
    expect(result.page).toBe(2);
  });

  test('sorts by age asc', async () => {
    const result = await getCandidates({ sort_by: 'age', sort_dir: 'asc' }, db);
    expect(result.data[0].age).toBe(30);
  });

  test('sorts by age desc', async () => {
    const result = await getCandidates({ sort_by: 'age', sort_dir: 'desc' }, db);
    expect(result.data[0].age).toBe(40);
  });

  test('ignores invalid sort_by', async () => {
    await expect(getCandidates({ sort_by: 'DROP TABLE--' }, db)).resolves.toBeDefined();
  });
});

// --- getCandidateById ---
describe('getCandidateById', () => {
  let db;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); });
  afterEach(() => db.close());

  test('returns candidate for valid id', async () => {
    const id = await insertCandidate(SAMPLE, db);
    const row = await getCandidateById(id, db);
    expect(row.id).toBe(id);
  });

  test('returns null for unknown id', async () => {
    const row = await getCandidateById(9999, db);
    expect(row).toBeNull();
  });
});

// --- getStats ---
describe('getStats', () => {
  let db;
  beforeEach(async () => {
    db = makeDb();
    await runMigrations(db);
    await insertCandidate(SAMPLE, db);
    await insertCandidate({ ...SAMPLE, gender: 'Male', nationality: 'Nigeria', type: 'Internal' }, db);
  });
  afterEach(() => db.close());

  test('returns correct total', async () => {
    const stats = await getStats(db);
    expect(stats.total).toBe(2);
  });

  test('returns all stat arrays', async () => {
    const stats = await getStats(db);
    expect(Array.isArray(stats.nationalities)).toBe(true);
    expect(Array.isArray(stats.genders)).toBe(true);
    expect(Array.isArray(stats.mauVotes)).toBe(true);
    expect(Array.isArray(stats.lukeVotes)).toBe(true);
    expect(Array.isArray(stats.types)).toBe(true);
  });
});

// --- clearCandidates ---
describe('clearCandidates', () => {
  let db;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); });
  afterEach(() => db.close());

  test('removes all rows', async () => {
    await insertCandidate(SAMPLE, db);
    await clearCandidates(db);
    const result = await getCandidates({}, db);
    expect(result.total).toBe(0);
  });
});

// --- error paths ---
describe('error handling', () => {
  test('insertCandidate rejects on missing table', async () => {
    const db = makeDb();
    await expect(insertCandidate(SAMPLE, db)).rejects.toThrow();
    db.close();
  });

  test('getCandidates rejects on missing table', async () => {
    const db = makeDb();
    await expect(getCandidates({}, db)).rejects.toThrow();
    db.close();
  });

  test('getCandidateById rejects on missing table', async () => {
    const db = makeDb();
    await expect(getCandidateById(1, db)).rejects.toThrow();
    db.close();
  });

  test('getStats rejects on missing table', async () => {
    const db = makeDb();
    await expect(getStats(db)).rejects.toThrow();
    db.close();
  });

  test('clearCandidates rejects on missing table', async () => {
    const db = makeDb();
    await expect(clearCandidates(db)).rejects.toThrow();
    db.close();
  });

  test('upsertResume rejects on missing table', async () => {
    const db = makeDb();
    await expect(upsertResume(1, 'text', db)).rejects.toThrow();
    db.close();
  });

  test('insertSkills rejects on missing table', async () => {
    const db = makeDb();
    await expect(insertSkills(1, ['Python'], db)).rejects.toThrow();
    db.close();
  });

  test('getResumeByCandidate rejects on missing table', async () => {
    const db = makeDb();
    await expect(getResumeByCandidate(1, db)).rejects.toThrow();
    db.close();
  });

  test('getSkillsByCandidate rejects on missing table', async () => {
    const db = makeDb();
    await expect(getSkillsByCandidate(1, db)).rejects.toThrow();
    db.close();
  });
});
