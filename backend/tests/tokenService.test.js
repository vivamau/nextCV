const sqlite3 = require('sqlite3').verbose();
const { runMigrations } = require('../services/dbService');
const { logTokenUsage, getTokenSummary, getTokenUsage } = require('../services/tokenService');

function makeDb() { return new sqlite3.Database(':memory:'); }

// --- logTokenUsage ---
describe('logTokenUsage', () => {
  let db;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); });
  afterEach(() => db.close());

  test('inserts a token usage record', async () => {
    await logTokenUsage({
      provider: 'ollama',
      model: 'llama3',
      operation: 'extract_skills',
      promptTokens: 100,
      completionTokens: 50,
    }, db);

    const row = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM token_usage WHERE provider = ?', ['ollama'], (err, r) => err ? reject(err) : resolve(r));
    });
    expect(row).toBeDefined();
    expect(row.provider).toBe('ollama');
    expect(row.model).toBe('llama3');
    expect(row.operation).toBe('extract_skills');
    expect(row.prompt_tokens).toBe(100);
    expect(row.completion_tokens).toBe(50);
    expect(row.total_tokens).toBe(150);
  });

  test('inserts multiple records', async () => {
    await logTokenUsage({ provider: 'ollama', model: 'llama3', operation: 'extract_skills', promptTokens: 100, completionTokens: 50 }, db);
    await logTokenUsage({ provider: 'ollama', model: 'mistral', operation: 'extract_links', promptTokens: 200, completionTokens: 80 }, db);

    const rows = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM token_usage', [], (err, r) => err ? reject(err) : resolve(r));
    });
    expect(rows).toHaveLength(2);
  });

  test('defaults tokens to 0 when not provided', async () => {
    await logTokenUsage({ provider: 'ollama', model: 'llama3', operation: 'embedding' }, db);

    const row = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM token_usage', [], (err, r) => err ? reject(err) : resolve(r));
    });
    expect(row.prompt_tokens).toBe(0);
    expect(row.completion_tokens).toBe(0);
    expect(row.total_tokens).toBe(0);
  });

  test('rejects on missing table', async () => {
    const bad = makeDb();
    await expect(logTokenUsage({ provider: 'ollama', model: 'llama3', operation: 'test' }, bad)).rejects.toThrow();
    bad.close();
  });
});

// --- getTokenSummary ---
describe('getTokenSummary', () => {
  let db;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); });
  afterEach(() => db.close());

  test('returns zero totals when no records', async () => {
    const summary = await getTokenSummary(db);
    expect(summary.totalTokens).toBe(0);
    expect(summary.totalPromptTokens).toBe(0);
    expect(summary.totalCompletionTokens).toBe(0);
    expect(summary.byModel).toEqual([]);
    expect(summary.byOperation).toEqual([]);
  });

  test('aggregates totals correctly', async () => {
    await logTokenUsage({ provider: 'ollama', model: 'llama3', operation: 'extract_skills', promptTokens: 100, completionTokens: 50 }, db);
    await logTokenUsage({ provider: 'ollama', model: 'llama3', operation: 'extract_links', promptTokens: 200, completionTokens: 80 }, db);

    const summary = await getTokenSummary(db);
    expect(summary.totalTokens).toBe(430);
    expect(summary.totalPromptTokens).toBe(300);
    expect(summary.totalCompletionTokens).toBe(130);
  });

  test('groups by provider and model', async () => {
    await logTokenUsage({ provider: 'ollama', model: 'llama3', operation: 'extract_skills', promptTokens: 100, completionTokens: 50 }, db);
    await logTokenUsage({ provider: 'ollama', model: 'mistral', operation: 'extract_skills', promptTokens: 200, completionTokens: 80 }, db);
    await logTokenUsage({ provider: 'gemini', model: 'llama3', operation: 'extract_skills', promptTokens: 300, completionTokens: 100 }, db);

    const summary = await getTokenSummary(db);
    expect(summary.byModel).toHaveLength(3);
    const llama = summary.byModel.find(m => m.provider === 'ollama' && m.model === 'llama3');
    expect(llama.total_tokens).toBe(150);
    expect(llama.prompt_tokens).toBe(100);
    expect(llama.completion_tokens).toBe(50);
    const mistral = summary.byModel.find(m => m.provider === 'ollama' && m.model === 'mistral');
    expect(mistral.total_tokens).toBe(280);
    const geminiLlama = summary.byModel.find(m => m.provider === 'gemini' && m.model === 'llama3');
    expect(geminiLlama.total_tokens).toBe(400);
  });

  test('groups by operation', async () => {
    await logTokenUsage({ provider: 'ollama', model: 'llama3', operation: 'extract_skills', promptTokens: 100, completionTokens: 50 }, db);
    await logTokenUsage({ provider: 'ollama', model: 'llama3', operation: 'embedding', promptTokens: 50, completionTokens: 0 }, db);

    const summary = await getTokenSummary(db);
    expect(summary.byOperation).toHaveLength(2);
    const skills = summary.byOperation.find(o => o.operation === 'extract_skills');
    expect(skills.total_tokens).toBe(150);
    const embedding = summary.byOperation.find(o => o.operation === 'embedding');
    expect(embedding.total_tokens).toBe(50);
  });
});

// --- getTokenUsage ---
describe('getTokenUsage', () => {
  let db;
  beforeEach(async () => { db = makeDb(); await runMigrations(db); });
  afterEach(() => db.close());

  test('returns all records ordered by created_at desc', async () => {
    await logTokenUsage({ provider: 'ollama', model: 'llama3', operation: 'extract_skills', promptTokens: 100, completionTokens: 50 }, db);
    await logTokenUsage({ provider: 'ollama', model: 'mistral', operation: 'extract_links', promptTokens: 200, completionTokens: 80 }, db);

    const rows = await getTokenUsage({}, db);
    expect(rows).toHaveLength(2);
    expect(rows[0].operation).toBe('extract_links'); // most recent first
  });

  test('filters by date range', async () => {
    await logTokenUsage({ provider: 'ollama', model: 'llama3', operation: 'extract_skills', promptTokens: 100, completionTokens: 50 }, db);

    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const rows = await getTokenUsage({ from: tomorrow }, db);
    expect(rows).toHaveLength(0);
  });

  test('limits results', async () => {
    await logTokenUsage({ provider: 'ollama', model: 'llama3', operation: 'extract_skills', promptTokens: 100, completionTokens: 50 }, db);
    await logTokenUsage({ provider: 'ollama', model: 'llama3', operation: 'extract_links', promptTokens: 200, completionTokens: 80 }, db);

    const rows = await getTokenUsage({ limit: 1 }, db);
    expect(rows).toHaveLength(1);
  });

  test('groups by day', async () => {
    await logTokenUsage({ provider: 'ollama', model: 'llama3', operation: 'extract_skills', promptTokens: 100, completionTokens: 50 }, db);
    await logTokenUsage({ provider: 'ollama', model: 'llama3', operation: 'extract_links', promptTokens: 200, completionTokens: 80 }, db);

    const rows = await getTokenUsage({ groupBy: 'day' }, db);
    expect(rows).toHaveLength(1); // same day
    expect(rows[0].total_tokens).toBe(430);
  });
});
