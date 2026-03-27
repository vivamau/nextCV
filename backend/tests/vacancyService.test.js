const sqlite3 = require('sqlite3').verbose();
const { runMigrations, insertCandidate, insertSkills } = require('../services/dbService');
const { createTor } = require('../services/torService');
const { replaceTorSkills } = require('../services/torSkillsService');
const {
  createVacancy, getVacancies, getVacancyById, updateVacancy, deleteVacancy,
  addCandidateToVacancy, removeCandidateFromVacancy,
  getCandidatesForVacancy, getVacanciesForCandidate,
  addAllCandidatesToVacancy
} = require('../services/vacancyService');

function makeDb() { return new sqlite3.Database(':memory:'); }

const VACANCY = { title: 'Programme Associate P2', description: 'Open position', tor_id: null };
const CANDIDATE = {
  job_application: 'Alice (C001)', type: 'External', wfp_jobs_applied: 1,
  skills_match_score: 'Good', nationality: 'Kenya', gender: 'Female',
  age: 30, language_skill: 'English', mau_vote: 'Yes', mau_comments: null,
  luke_vote: 'Yes', luke_comments: null,
};

// --- createVacancy ---
describe('createVacancy', () => {
  let db;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); });
  afterEach(() => db.close());

  test('returns numeric id', async () => {
    const id = await createVacancy(VACANCY, db);
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  test('persists all fields', async () => {
    const id = await createVacancy({ ...VACANCY, opened_at: '2026-01-01', closed_at: '2026-06-01' }, db);
    const row = await getVacancyById(id, db);
    expect(row.title).toBe(VACANCY.title);
    expect(row.description).toBe(VACANCY.description);
    expect(row.opened_at).toBe('2026-01-01');
    expect(row.closed_at).toBe('2026-06-01');
  });

  test('allows null optional fields', async () => {
    const id = await createVacancy({ title: 'Minimal' }, db);
    const row = await getVacancyById(id, db);
    expect(row.description).toBeNull();
    expect(row.tor_id).toBeNull();
    expect(row.closed_at).toBeNull();
  });

  test('links to tor via FK', async () => {
    const torId = await createTor({ name: 'TOR A' }, db);
    const id = await createVacancy({ title: 'V1', tor_id: torId }, db);
    const row = await getVacancyById(id, db);
    expect(row.tor_id).toBe(torId);
    expect(row.tor_name).toBe('TOR A');
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(createVacancy(VACANCY, bad)).rejects.toThrow();
    bad.close();
  });
});

// --- getVacancies ---
describe('getVacancies', () => {
  let db;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); });
  afterEach(() => db.close());

  test('returns empty array when none', async () => {
    expect(await getVacancies(db)).toEqual([]);
  });

  test('returns all vacancies with tor_name', async () => {
    await createVacancy({ title: 'V1' }, db);
    await createVacancy({ title: 'V2' }, db);
    const rows = await getVacancies(db);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveProperty('tor_name');
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(getVacancies(bad)).rejects.toThrow();
    bad.close();
  });
});

// --- getVacancyById ---
describe('getVacancyById', () => {
  let db;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); });
  afterEach(() => db.close());

  test('returns vacancy for valid id', async () => {
    const id = await createVacancy(VACANCY, db);
    const row = await getVacancyById(id, db);
    expect(row.id).toBe(id);
  });

  test('returns null for unknown id', async () => {
    expect(await getVacancyById(9999, db)).toBeNull();
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(getVacancyById(1, bad)).rejects.toThrow();
    bad.close();
  });
});

// --- updateVacancy ---
describe('updateVacancy', () => {
  let db, vacId;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); vacId = await createVacancy(VACANCY, db); });
  afterEach(() => db.close());

  test('updates fields', async () => {
    await updateVacancy(vacId, { title: 'Updated', closed_at: '2026-12-31' }, db);
    const row = await getVacancyById(vacId, db);
    expect(row.title).toBe('Updated');
    expect(row.closed_at).toBe('2026-12-31');
  });

  test('returns 0 for unknown id', async () => {
    expect(await updateVacancy(9999, { title: 'X' }, db)).toBe(0);
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(updateVacancy(1, { title: 'X' }, bad)).rejects.toThrow();
    bad.close();
  });
});

// --- deleteVacancy ---
describe('deleteVacancy', () => {
  let db, vacId;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); vacId = await createVacancy(VACANCY, db); });
  afterEach(() => db.close());

  test('deletes vacancy', async () => {
    expect(await deleteVacancy(vacId, db)).toBe(1);
    expect(await getVacancyById(vacId, db)).toBeNull();
  });

  test('returns 0 for unknown id', async () => {
    expect(await deleteVacancy(9999, db)).toBe(0);
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(deleteVacancy(1, bad)).rejects.toThrow();
    bad.close();
  });
});

// --- candidates_to_vacancies ---
describe('addCandidateToVacancy / removeCandidateFromVacancy', () => {
  let db, vacId, candId;
  beforeEach(async () => {
    db = makeDb(); await runMigrations(db);
    vacId = await createVacancy(VACANCY, db);
    candId = await insertCandidate(CANDIDATE, db);
  });
  afterEach(() => db.close());

  test('adds candidate to vacancy', async () => {
    await addCandidateToVacancy(candId, vacId, db);
    const list = await getCandidatesForVacancy(vacId, db);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(candId);
  });

  test('is idempotent (INSERT OR IGNORE)', async () => {
    await addCandidateToVacancy(candId, vacId, db);
    await addCandidateToVacancy(candId, vacId, db);
    expect(await getCandidatesForVacancy(vacId, db)).toHaveLength(1);
  });

  test('removes candidate from vacancy', async () => {
    await addCandidateToVacancy(candId, vacId, db);
    await removeCandidateFromVacancy(candId, vacId, db);
    expect(await getCandidatesForVacancy(vacId, db)).toHaveLength(0);
  });

  test('returns 0 when removing non-existent link', async () => {
    expect(await removeCandidateFromVacancy(9999, vacId, db)).toBe(0);
  });

  test('rejects addCandidateToVacancy on missing table', async () => {
    const bad = makeDb();
    await expect(addCandidateToVacancy(1, 1, bad)).rejects.toThrow();
    bad.close();
  });

  test('rejects removeCandidateFromVacancy on missing table', async () => {
    const bad = makeDb();
    await expect(removeCandidateFromVacancy(1, 1, bad)).rejects.toThrow();
    bad.close();
  });
});

// --- getCandidatesForVacancy / getVacanciesForCandidate ---
describe('getCandidatesForVacancy / getVacanciesForCandidate', () => {
  let db, vacId, candId;
  beforeEach(async () => {
    db = makeDb(); await runMigrations(db);
    vacId = await createVacancy(VACANCY, db);
    candId = await insertCandidate(CANDIDATE, db);
    await addCandidateToVacancy(candId, vacId, db);
  });
  afterEach(() => db.close());

  test('getCandidatesForVacancy returns candidates with added_at', async () => {
    const list = await getCandidatesForVacancy(vacId, db);
    expect(list[0]).toHaveProperty('added_at');
    expect(list[0].job_application).toBe(CANDIDATE.job_application);
  });

  test('getVacanciesForCandidate returns vacancies', async () => {
    const list = await getVacanciesForCandidate(candId, db);
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe(VACANCY.title);
  });

  test('getCandidatesForVacancy rejects on missing table', async () => {
    const bad = makeDb();
    await expect(getCandidatesForVacancy(1, bad)).rejects.toThrow();
    bad.close();
  });

  test('getVacanciesForCandidate rejects on missing table', async () => {
    const bad = makeDb();
    await expect(getVacanciesForCandidate(1, bad)).rejects.toThrow();
    bad.close();
  });
});

// --- skill_match_count ---
describe('getCandidatesForVacancy — skill_match_count', () => {
  let db, vacId, candId, torId;

  beforeEach(async () => {
    db = makeDb();
    await runMigrations(db);

    // Create TOR with skills
    torId = await createTor({ name: 'TOR with skills' }, db);
    await replaceTorSkills(torId, ['Python', 'SQL', 'Communication'], db);

    // Create vacancy linked to that TOR
    vacId = await createVacancy({ title: 'V1', tor_id: torId }, db);

    // Create candidate with overlapping skills
    candId = await insertCandidate(CANDIDATE, db);
    await insertSkills(candId, ['Python', 'SQL', 'Leadership'], db);

    await addCandidateToVacancy(candId, vacId, db);
  });

  afterEach(() => db.close());

  test('returns weighted_score field', async () => {
    const list = await getCandidatesForVacancy(vacId, db);
    expect(list[0]).toHaveProperty('weighted_score');
  });

  test('calculates weighted score correctly (2 matches x default 3 = 6)', async () => {
    const list = await getCandidatesForVacancy(vacId, db);
    expect(list[0].weighted_score).toBe(6);
  });

  test('addAllCandidatesToVacancy should add all candidates to vacancy', async () => {
    const vId = await createVacancy({ title: 'Bulk Test Vacancy' }, db);
    const count = await addAllCandidatesToVacancy(vId, db);
    expect(count).toBeGreaterThan(0);
    const rows = await getCandidatesForVacancy(vId, db);
    expect(rows.length).toBeGreaterThan(0);
  });

  test('returns 0 when no skills overlap', async () => {
    const cand2 = await insertCandidate({ ...CANDIDATE, job_application: 'Bob (C002)' }, db);
    await insertSkills(cand2, ['Java', 'Kotlin'], db);
    await addCandidateToVacancy(cand2, vacId, db);
    const list = await getCandidatesForVacancy(vacId, db);
    const bob = list.find(c => c.id === cand2);
    expect(bob.weighted_score).toBe(0);
  });

  test('returns 0 when vacancy has no TOR', async () => {
    const vacNoTor = await createVacancy({ title: 'No TOR' }, db);
    await addCandidateToVacancy(candId, vacNoTor, db);
    const list = await getCandidatesForVacancy(vacNoTor, db);
    expect(list[0].weighted_score).toBe(0);
  });

  test('is case-insensitive for skill matching', async () => {
    const cand3 = await insertCandidate({ ...CANDIDATE, job_application: 'Carol (C003)' }, db);
    await insertSkills(cand3, ['python', 'sql'], db); // lowercase
    await addCandidateToVacancy(cand3, vacId, db);
    const list = await getCandidatesForVacancy(vacId, db);
    const carol = list.find(c => c.id === cand3);
    expect(carol.weighted_score).toBe(6);
  });

  test('sorts candidates by weighted_score primarily', async () => {
    const cand2Id = await insertCandidate({ ...CANDIDATE, job_application: 'Bob (C002)' }, db);
    await insertSkills(cand2Id, ['Java'], db); // 0 matches
    await addCandidateToVacancy(cand2Id, vacId, db);
    const list = await getCandidatesForVacancy(vacId, db);
    expect(list[0].weighted_score).toBeGreaterThanOrEqual(list[1].weighted_score);
  });
});
