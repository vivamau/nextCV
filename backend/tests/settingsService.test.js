const sqlite3 = require('sqlite3').verbose();
const { runMigrations } = require('../services/dbService');
const { getSetting, setSetting, getAllSettings } = require('../services/settingsService');

function makeDb() { return new sqlite3.Database(':memory:'); }

// --- getSetting ---
describe('getSetting', () => {
  let db;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); });
  afterEach(() => db.close());

  test('returns default ollama_url after migration', async () => {
    const val = await getSetting('ollama_url', db);
    expect(val).toBe('http://localhost:11434');
  });

  test('returns default llm_provider as none', async () => {
    const val = await getSetting('llm_provider', db);
    expect(val).toBe('none');
  });

  test('returns null for unknown key', async () => {
    const val = await getSetting('nonexistent', db);
    expect(val).toBeNull();
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(getSetting('key', bad)).rejects.toThrow();
    bad.close();
  });
});

// --- setSetting ---
describe('setSetting', () => {
  let db;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); });
  afterEach(() => db.close());

  test('inserts a new key', async () => {
    await setSetting('new_key', 'new_value', db);
    const val = await getSetting('new_key', db);
    expect(val).toBe('new_value');
  });

  test('updates an existing key', async () => {
    await setSetting('llm_provider', 'ollama', db);
    const val = await getSetting('llm_provider', db);
    expect(val).toBe('ollama');
  });

  test('upserts without error on repeated calls', async () => {
    await setSetting('llm_model', 'llama3', db);
    await setSetting('llm_model', 'mistral', db);
    const val = await getSetting('llm_model', db);
    expect(val).toBe('mistral');
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(setSetting('k', 'v', bad)).rejects.toThrow();
    bad.close();
  });
});

// --- getAllSettings ---
describe('getAllSettings', () => {
  let db;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); });
  afterEach(() => db.close());

  test('returns object with all default keys', async () => {
    const settings = await getAllSettings(db);
    expect(settings).toHaveProperty('llm_provider', 'none');
    expect(settings).toHaveProperty('llm_model');
    expect(settings).toHaveProperty('ollama_url');
  });

  test('reflects updated values', async () => {
    await setSetting('llm_provider', 'ollama', db);
    const settings = await getAllSettings(db);
    expect(settings.llm_provider).toBe('ollama');
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(getAllSettings(bad)).rejects.toThrow();
    bad.close();
  });
});
