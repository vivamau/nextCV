const sqlite3 = require('sqlite3').verbose();
const { runMigrations } = require('../services/dbService');
const { createTor, getTors, getTorById, updateTor, deleteTor } = require('../services/torService');

function makeDb() { return new sqlite3.Database(':memory:'); }

const SAMPLE = {
  name: 'Programme Associate P2',
  description: 'TOR for Programme Associate position',
  va_link: 'https://wfp.org/jobs/123',
  file_name: 'tor_pa_p2.pdf',
  file_content: 'Full text of the TOR document...',
};

// --- createTor ---
describe('createTor', () => {
  let db;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); });
  afterEach(() => db.close());

  test('returns a numeric id', async () => {
    const id = await createTor(SAMPLE, db);
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  test('persists all fields', async () => {
    const id = await createTor(SAMPLE, db);
    const row = await getTorById(id, db);
    expect(row.name).toBe(SAMPLE.name);
    expect(row.description).toBe(SAMPLE.description);
    expect(row.va_link).toBe(SAMPLE.va_link);
    expect(row.file_name).toBe(SAMPLE.file_name);
    expect(row.file_content).toBe(SAMPLE.file_content);
  });

  test('allows null optional fields', async () => {
    const id = await createTor({ name: 'Minimal TOR' }, db);
    const row = await getTorById(id, db);
    expect(row.name).toBe('Minimal TOR');
    expect(row.description).toBeNull();
    expect(row.va_link).toBeNull();
    expect(row.file_name).toBeNull();
    expect(row.file_content).toBeNull();
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(createTor(SAMPLE, bad)).rejects.toThrow();
    bad.close();
  });
});

// --- getTors ---
describe('getTors', () => {
  let db;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); });
  afterEach(() => db.close());

  test('returns empty array when no tors', async () => {
    const rows = await getTors(db);
    expect(rows).toEqual([]);
  });

  test('returns all tors ordered by created_at desc', async () => {
    await createTor({ name: 'TOR A' }, db);
    await createTor({ name: 'TOR B' }, db);
    const rows = await getTors(db);
    expect(rows).toHaveLength(2);
  });

  test('does NOT include file_content in list (bandwidth)', async () => {
    await createTor(SAMPLE, db);
    const rows = await getTors(db);
    expect(rows[0]).not.toHaveProperty('file_content');
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(getTors(bad)).rejects.toThrow();
    bad.close();
  });
});

// --- getTorById ---
describe('getTorById', () => {
  let db;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); });
  afterEach(() => db.close());

  test('returns full tor including file_content', async () => {
    const id = await createTor(SAMPLE, db);
    const row = await getTorById(id, db);
    expect(row.id).toBe(id);
    expect(row.file_content).toBe(SAMPLE.file_content);
  });

  test('returns null for unknown id', async () => {
    const row = await getTorById(9999, db);
    expect(row).toBeNull();
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(getTorById(1, bad)).rejects.toThrow();
    bad.close();
  });
});

// --- updateTor ---
describe('updateTor', () => {
  let db, torId;
  beforeEach(async () => {
    db = makeDb();
    await runMigrations(db);
    torId = await createTor(SAMPLE, db);
  });
  afterEach(() => db.close());

  test('updates name and description', async () => {
    await updateTor(torId, { name: 'Updated Name', description: 'New desc' }, db);
    const row = await getTorById(torId, db);
    expect(row.name).toBe('Updated Name');
    expect(row.description).toBe('New desc');
  });

  test('preserves file_content when not provided', async () => {
    await updateTor(torId, { name: 'Updated', file_content: null }, db);
    const row = await getTorById(torId, db);
    expect(row.file_content).toBe(SAMPLE.file_content);
  });

  test('updates file_content when provided', async () => {
    await updateTor(torId, { name: 'Updated', file_content: 'New content' }, db);
    const row = await getTorById(torId, db);
    expect(row.file_content).toBe('New content');
  });

  test('returns 0 changes for unknown id', async () => {
    const changes = await updateTor(9999, { name: 'X' }, db);
    expect(changes).toBe(0);
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(updateTor(1, { name: 'X' }, bad)).rejects.toThrow();
    bad.close();
  });
});

// --- deleteTor ---
describe('deleteTor', () => {
  let db, torId;
  beforeEach(async () => {
    db = makeDb();
    await runMigrations(db);
    torId = await createTor(SAMPLE, db);
  });
  afterEach(() => db.close());

  test('deletes existing tor', async () => {
    const changes = await deleteTor(torId, db);
    expect(changes).toBe(1);
    const row = await getTorById(torId, db);
    expect(row).toBeNull();
  });

  test('returns 0 for unknown id', async () => {
    const changes = await deleteTor(9999, db);
    expect(changes).toBe(0);
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(deleteTor(1, bad)).rejects.toThrow();
    bad.close();
  });
});
