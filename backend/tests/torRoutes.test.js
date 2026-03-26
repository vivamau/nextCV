const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const path = require('path');

let mockDb;

jest.mock('../config/db', () => ({ getDb: () => mockDb }));

const { runMigrations } = require('../services/dbService');
const torRoutes = require('../routes/torRoutes');

const app = express();
app.use(express.json());
app.use('/api/tors', torRoutes);

const SAMPLE = {
  name: 'Programme Associate P2',
  description: 'TOR for Programme Associate',
  va_link: 'https://wfp.org/jobs/123',
};

let torId;

beforeEach(async () => {
  mockDb = new sqlite3.Database(':memory:');
  await runMigrations(mockDb);
  const res = await request(app).post('/api/tors').send(SAMPLE);
  torId = res.body.id;
});

afterEach(async () => {
  try { mockDb.close(); } catch (_) {}
});

// --- POST /api/tors ---
describe('POST /api/tors', () => {
  test('creates a TOR and returns 201 with id', async () => {
    const res = await request(app).post('/api/tors').send({ name: 'New TOR' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/tors').send({ description: 'no name' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('accepts all optional fields', async () => {
    const res = await request(app).post('/api/tors').send({
      name: 'Full TOR', description: 'desc', va_link: 'https://example.com',
      file_name: 'tor.pdf', file_content: 'content',
    });
    expect(res.status).toBe(201);
  });
});

// --- GET /api/tors ---
describe('GET /api/tors', () => {
  test('returns 200 with array', async () => {
    const res = await request(app).get('/api/tors');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('list items do not include file_content', async () => {
    const res = await request(app).get('/api/tors');
    expect(res.body[0]).not.toHaveProperty('file_content');
  });
});

// --- GET /api/tors/:id ---
describe('GET /api/tors/:id', () => {
  test('returns full TOR with file_content', async () => {
    const res = await request(app).get(`/api/tors/${torId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(torId);
    expect(res.body.name).toBe(SAMPLE.name);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/tors/99999');
    expect(res.status).toBe(404);
  });
});

// --- PUT /api/tors/:id ---
describe('PUT /api/tors/:id', () => {
  test('updates and returns 200', async () => {
    const res = await request(app).put(`/api/tors/${torId}`).send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.changes).toBe(1);
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app).put(`/api/tors/${torId}`).send({ description: 'no name' });
    expect(res.status).toBe(400);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).put('/api/tors/99999').send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

// --- DELETE /api/tors/:id ---
describe('DELETE /api/tors/:id', () => {
  test('deletes and returns 200', async () => {
    const res = await request(app).delete(`/api/tors/${torId}`);
    expect(res.status).toBe(200);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/tors/99999');
    expect(res.status).toBe(404);
  });
});

// --- 500 error paths ---
describe('500 error handling', () => {
  beforeEach(() => { mockDb.close(); });

  test('POST returns 500', async () => {
    const res = await request(app).post('/api/tors').send({ name: 'X' });
    expect(res.status).toBe(500);
  });

  test('GET list returns 500', async () => {
    const res = await request(app).get('/api/tors');
    expect(res.status).toBe(500);
  });

  test('GET by id returns 500', async () => {
    const res = await request(app).get('/api/tors/1');
    expect(res.status).toBe(500);
  });

  test('PUT returns 500', async () => {
    const res = await request(app).put('/api/tors/1').send({ name: 'X' });
    expect(res.status).toBe(500);
  });

  test('DELETE returns 500', async () => {
    const res = await request(app).delete('/api/tors/1');
    expect(res.status).toBe(500);
  });
});
