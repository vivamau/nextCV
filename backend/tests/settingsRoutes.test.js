const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');

let mockDb;
jest.mock('../config/db', () => ({ getDb: () => mockDb }));

// Mock axios used inside settingsRoutes to call Ollama
jest.mock('axios');
const axios = require('axios');

const { runMigrations } = require('../services/dbService');
const settingsRoutes = require('../routes/settingsRoutes');

const app = express();
app.use(express.json());
app.use('/api/settings', settingsRoutes);

beforeEach(async () => {
  mockDb = new sqlite3.Database(':memory:');
  await runMigrations(mockDb);
});

afterEach(async () => {
  try { mockDb.close(); } catch (_) {}
});

// --- GET /api/settings ---
describe('GET /api/settings', () => {
  test('returns all settings as object', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('llm_provider');
    expect(res.body).toHaveProperty('ollama_url');
  });
});

// --- PUT /api/settings ---
describe('PUT /api/settings', () => {
  test('saves llm_provider and llm_model', async () => {
    const res = await request(app).put('/api/settings').send({
      llm_provider: 'ollama',
      llm_model: 'llama3',
      ollama_url: 'http://localhost:11434',
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('returns 400 when llm_provider is missing', async () => {
    const res = await request(app).put('/api/settings').send({ llm_model: 'llama3' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when ollama selected but no model', async () => {
    const res = await request(app).put('/api/settings').send({
      llm_provider: 'ollama',
      llm_model: '',
      ollama_url: 'http://localhost:11434',
    });
    expect(res.status).toBe(400);
  });

  test('accepts provider none without model', async () => {
    const res = await request(app).put('/api/settings').send({ llm_provider: 'none' });
    expect(res.status).toBe(200);
  });

  test('saves openrouter provider with model and api key', async () => {
    const res = await request(app).put('/api/settings').send({
      llm_provider: 'openrouter',
      openrouter_api_key: 'or-key',
      openrouter_model: 'openai/gpt-4o-mini',
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const all = await request(app).get('/api/settings');
    expect(all.body.openrouter_api_key).toBe('or-key');
    expect(all.body.openrouter_model).toBe('openai/gpt-4o-mini');
  });

  test('returns 400 when openrouter provider has no api key', async () => {
    const res = await request(app).put('/api/settings').send({
      llm_provider: 'openrouter',
      openrouter_model: 'openai/gpt-4o-mini',
    });
    expect(res.status).toBe(400);
  });

  test('returns 400 when openrouter provider has no model', async () => {
    const res = await request(app).put('/api/settings').send({
      llm_provider: 'openrouter',
      openrouter_api_key: 'or-key',
    });
    expect(res.status).toBe(400);
  });
});

// --- GET /api/settings/ollama/models ---
describe('GET /api/settings/ollama/models', () => {
  test('returns model list from Ollama', async () => {
    axios.get.mockResolvedValueOnce({
      data: { models: [{ name: 'llama3' }, { name: 'mistral' }] },
    });
    const res = await request(app).get('/api/settings/ollama/models?url=http://localhost:11434');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(['llama3', 'mistral']);
  });

  test('returns 502 when Ollama is unreachable', async () => {
    axios.get.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    const res = await request(app).get('/api/settings/ollama/models?url=http://localhost:11434');
    expect(res.status).toBe(502);
    expect(res.body.error).toBeDefined();
  });

  test('uses saved ollama_url when no query param', async () => {
    axios.get.mockResolvedValueOnce({ data: { models: [] } });
    const res = await request(app).get('/api/settings/ollama/models');
    expect(res.status).toBe(200);
  });
});

// --- GET /api/settings/openrouter/models ---
describe('GET /api/settings/openrouter/models', () => {
  test('returns sorted model ids from OpenRouter', async () => {
    axios.get.mockResolvedValueOnce({
      data: { data: [{ id: 'openai/gpt-4o' }, { id: 'anthropic/claude-3-haiku' }] },
    });
    const res = await request(app).get('/api/settings/openrouter/models?api_key=k');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(['anthropic/claude-3-haiku', 'openai/gpt-4o']);
  });

  test('passes Authorization header when api_key provided', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: [] } });
    await request(app).get('/api/settings/openrouter/models?api_key=secret');
    expect(axios.get).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/models',
      expect.objectContaining({ headers: { Authorization: 'Bearer secret' } })
    );
  });

  test('returns 502 when OpenRouter is unreachable', async () => {
    axios.get.mockRejectedValueOnce(new Error('network down'));
    const res = await request(app).get('/api/settings/openrouter/models?api_key=k');
    expect(res.status).toBe(502);
  });
});

// --- GET /api/settings/token-usage/summary ---
describe('GET /api/settings/token-usage/summary', () => {
  test('returns summary with zero totals when empty', async () => {
    const res = await request(app).get('/api/settings/token-usage/summary');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalTokens');
    expect(res.body.totalTokens).toBe(0);
    expect(Array.isArray(res.body.byModel)).toBe(true);
    expect(Array.isArray(res.body.byOperation)).toBe(true);
  });
});

// --- GET /api/settings/token-usage ---
describe('GET /api/settings/token-usage', () => {
  test('returns empty array when no records', async () => {
    const res = await request(app).get('/api/settings/token-usage');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('accepts groupBy day query param', async () => {
    const res = await request(app).get('/api/settings/token-usage?group_by=day');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('accepts limit query param', async () => {
    const res = await request(app).get('/api/settings/token-usage?limit=5');
    expect(res.status).toBe(200);
  });
});

// --- 500 error paths ---
describe('500 error handling', () => {
  beforeEach(() => { mockDb.close(); });

  test('GET /api/settings returns 500', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(500);
  });

  test('PUT /api/settings returns 500', async () => {
    const res = await request(app).put('/api/settings').send({ llm_provider: 'none' });
    expect(res.status).toBe(500);
  });

  test('GET /api/settings/token-usage/summary returns 500', async () => {
    const res = await request(app).get('/api/settings/token-usage/summary');
    expect(res.status).toBe(500);
  });

  test('GET /api/settings/token-usage returns 500', async () => {
    const res = await request(app).get('/api/settings/token-usage');
    expect(res.status).toBe(500);
  });
});
