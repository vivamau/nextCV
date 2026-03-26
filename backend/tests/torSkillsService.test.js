const sqlite3 = require('sqlite3').verbose();
const { runMigrations } = require('../services/dbService');
const { createTor } = require('../services/torService');
const { replaceTorSkills, getTorSkills, deleteTorSkills } = require('../services/torSkillsService');

function makeDb() { return new sqlite3.Database(':memory:'); }

const TOR = { name: 'Programme Associate P2', description: 'Test TOR' };

// --- replaceTorSkills ---
describe('replaceTorSkills', () => {
  let db, torId;
  beforeEach(async () => {
    db = makeDb();
    await runMigrations(db);
    torId = await createTor(TOR, db);
  });
  afterEach(() => db.close());

  test('inserts skills and returns them', async () => {
    const inserted = await replaceTorSkills(torId, ['Python', 'SQL', 'Communication'], db);
    expect(inserted).toHaveLength(3);
    expect(inserted).toContain('Python');
  });

  test('replaces existing skills on second call', async () => {
    await replaceTorSkills(torId, ['Python', 'SQL'], db);
    await replaceTorSkills(torId, ['Java', 'Leadership'], db);
    const skills = await getTorSkills(torId, db);
    expect(skills.map(s => s.skill)).not.toContain('Python');
    expect(skills.map(s => s.skill)).toContain('Java');
  });

  test('handles empty array — clears skills', async () => {
    await replaceTorSkills(torId, ['Python'], db);
    await replaceTorSkills(torId, [], db);
    const skills = await getTorSkills(torId, db);
    expect(skills).toHaveLength(0);
  });

  test('handles null — clears skills', async () => {
    await replaceTorSkills(torId, ['Python'], db);
    const result = await replaceTorSkills(torId, null, db);
    expect(result).toEqual([]);
  });

  test('trims whitespace from skills', async () => {
    await replaceTorSkills(torId, ['  Python  ', ' SQL '], db);
    const skills = await getTorSkills(torId, db);
    expect(skills[0].skill).toBe('Python');
  });

  test('skips blank entries', async () => {
    await replaceTorSkills(torId, ['Python', '', '  '], db);
    const skills = await getTorSkills(torId, db);
    expect(skills).toHaveLength(1);
  });

  test('resolves with empty array when all entries are blank', async () => {
    // Covers the --pending === 0 branch inside the blank-skip path
    const result = await replaceTorSkills(torId, ['', '  ', '\t'], db);
    expect(result).toEqual([]);
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(replaceTorSkills(1, ['Python'], bad)).rejects.toThrow();
    bad.close();
  });

  test('rejects when stmt.run fails', async () => {
    const db2 = makeDb();
    await runMigrations(db2);
    const id = await createTor(TOR, db2);
    // Monkey-patch prepare to return a stmt whose run always errors
    const orig = db2.prepare.bind(db2);
    db2.prepare = (sql, cb) => {
      const stmt = { run: (params, cb2) => cb2(new Error('run failed')), finalize: () => {} };
      cb(null);
      return stmt;
    };
    await expect(replaceTorSkills(id, ['Python'], db2)).rejects.toThrow('run failed');
    db2.prepare = orig;
    db2.close();
  });
});

// --- getTorSkills ---
describe('getTorSkills', () => {
  let db, torId;
  beforeEach(async () => {
    db = makeDb();
    await runMigrations(db);
    torId = await createTor(TOR, db);
  });
  afterEach(() => db.close());

  test('returns empty array when no skills', async () => {
    const skills = await getTorSkills(torId, db);
    expect(skills).toEqual([]);
  });

  test('returns skills sorted alphabetically', async () => {
    await replaceTorSkills(torId, ['Zebra', 'Apple', 'Mango'], db);
    const skills = await getTorSkills(torId, db);
    expect(skills[0].skill).toBe('Apple');
    expect(skills[2].skill).toBe('Zebra');
  });

  test('each row has id, skill, extracted_at', async () => {
    await replaceTorSkills(torId, ['Python'], db);
    const skills = await getTorSkills(torId, db);
    expect(skills[0]).toHaveProperty('id');
    expect(skills[0]).toHaveProperty('skill');
    expect(skills[0]).toHaveProperty('extracted_at');
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(getTorSkills(1, bad)).rejects.toThrow();
    bad.close();
  });
});

// --- deleteTorSkills ---
describe('deleteTorSkills', () => {
  let db, torId;
  beforeEach(async () => {
    db = makeDb();
    await runMigrations(db);
    torId = await createTor(TOR, db);
  });
  afterEach(() => db.close());

  test('deletes all skills for a tor', async () => {
    await replaceTorSkills(torId, ['Python', 'SQL'], db);
    const changes = await deleteTorSkills(torId, db);
    expect(changes).toBe(2);
    expect(await getTorSkills(torId, db)).toHaveLength(0);
  });

  test('returns 0 when no skills exist', async () => {
    const changes = await deleteTorSkills(torId, db);
    expect(changes).toBe(0);
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(deleteTorSkills(1, bad)).rejects.toThrow();
    bad.close();
  });

  test('rejects when db.run errors on delete', async () => {
    const db2 = makeDb();
    await runMigrations(db2);
    const id = await createTor(TOR, db2);
    // Force an error by closing db before the call
    db2.close();
    await expect(deleteTorSkills(id, db2)).rejects.toThrow();
  });
});
