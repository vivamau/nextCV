const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');

let mockDb;
jest.mock('../config/db', () => ({ getDb: () => mockDb }));
jest.mock('axios');
const axios = require('axios');

const { runMigrations } = require('../services/dbService');
const { createTor } = require('../services/torService');
const torRoutes = require('../routes/torRoutes');

const app = express();
app.use(express.json());
app.use('/api/tors', torRoutes);

let torId;

beforeEach(async () => {
  mockDb = new sqlite3.Database(':memory:');
  await runMigrations(mockDb);
  torId = await createTor({
    name: 'Programme Associate',
    file_content: 'We need Python, SQL and communication skills.',
  }, mockDb);
});

afterEach(async () => {
  try { mockDb.close(); } catch (_) {}
  jest.clearAllMocks();
});

async function setProvider(db, provider = 'ollama', model = 'llama3') {
  await new Promise((res, rej) =>
    db.run("INSERT OR REPLACE INTO settings (key,value) VALUES ('llm_provider',?)", [provider], (e) => e ? rej(e) : res())
  );
  await new Promise((res, rej) =>
    db.run("INSERT OR REPLACE INTO settings (key,value) VALUES ('llm_model',?)", [model], (e) => e ? rej(e) : res())
  );
}

// --- POST /api/tors/:id/extract-skills ---
describe('POST /api/tors/:id/extract-skills', () => {
  test('returns 200 with extracted skills', async () => {
    await setProvider(mockDb);
    axios.post.mockResolvedValueOnce({
      data: { response: '["Python","SQL","Communication"]' },
    });
    const res = await request(app).post(`/api/tors/${torId}/extract-skills`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.skills)).toBe(true);
    expect(res.body.skills[0]).toHaveProperty('skill', 'Python');
    expect(res.body.skills[0]).toHaveProperty('weight', 3);
  });

  test('returns 404 for unknown tor id', async () => {
    const res = await request(app).post('/api/tors/99999/extract-skills');
    expect(res.status).toBe(404);
  });

  test('returns 400 when TOR has no file_content', async () => {
    await setProvider(mockDb);
    const emptyId = await createTor({ name: 'Empty TOR' }, mockDb);
    const res = await request(app).post(`/api/tors/${emptyId}/extract-skills`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no text/i);
  });

  test('returns 422 when LLM provider is none', async () => {
    // Default migration seeds llm_provider=none — no override needed
    const res = await request(app).post(`/api/tors/${torId}/extract-skills`);
    expect(res.status).toBe(422);
  });

  test('returns 502 when Ollama is unreachable', async () => {
    await setProvider(mockDb);
    axios.post.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    const res = await request(app).post(`/api/tors/${torId}/extract-skills`);
    expect(res.status).toBe(502);
  });
});

// --- GET /api/tors/:id/skills ---
describe('GET /api/tors/:id/skills', () => {
  test('returns empty array when no skills extracted', async () => {
    const res = await request(app).get(`/api/tors/${torId}/skills`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns skills after extraction', async () => {
    await setProvider(mockDb);
    axios.post.mockResolvedValueOnce({ data: { response: '["Python","SQL"]' } });
    await request(app).post(`/api/tors/${torId}/extract-skills`);
    const res = await request(app).get(`/api/tors/${torId}/skills`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('weight');
  });

  test('returns 500 on db error', async () => {
    mockDb.close();
    const res = await request(app).get(`/api/tors/${torId}/skills`);
    expect(res.status).toBe(500);
  });
});
