const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');

let mockDb;
jest.mock('../config/db', () => ({ getDb: () => mockDb }));

const { runMigrations, insertCandidate } = require('../services/dbService');
const { createTor } = require('../services/torService');
const { rankCandidatesByTor } = require('../services/vectorService');
const vacancyRoutes = require('../routes/vacancyRoutes');

jest.mock('../services/vectorService', () => ({
  rankCandidatesByTor: jest.fn().mockResolvedValue([])
}));

const app = express();
app.use(express.json());
app.use('/api/vacancies', vacancyRoutes);

const VACANCY = { title: 'Programme Associate P2', description: 'Open role' };
const CANDIDATE = {
  job_application: 'Alice (C001)', type: 'External', wfp_jobs_applied: 1,
  skills_match_score: 'Good', nationality: 'Kenya', gender: 'Female',
  age: 30, language_skill: 'English', mau_vote: 'Yes', mau_comments: null,
  luke_vote: 'Yes', luke_comments: null,
};

let vacId, candId;

beforeEach(async () => {
  mockDb = new sqlite3.Database(':memory:');
  await runMigrations(mockDb);
  const res = await request(app).post('/api/vacancies').send(VACANCY);
  vacId = res.body.id;
  candId = await insertCandidate(CANDIDATE, mockDb);
});

afterEach(async () => {
  try { mockDb.close(); } catch (_) {}
});

describe('POST /api/vacancies', () => {
  test('creates vacancy and returns 201', async () => {
    const res = await request(app).post('/api/vacancies').send({ title: 'New Role' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  test('returns 400 when title missing', async () => {
    const res = await request(app).post('/api/vacancies').send({ description: 'no title' });
    expect(res.status).toBe(400);
  });

  test('accepts all optional fields', async () => {
    const res = await request(app).post('/api/vacancies').send({
      title: 'Full', description: 'desc', tor_id: null,
      opened_at: '2026-01-01', closed_at: '2026-12-31',
    });
    expect(res.status).toBe(201);
  });
});

describe('GET /api/vacancies', () => {
  test('returns array of vacancies', async () => {
    const res = await request(app).get('/api/vacancies');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/vacancies/:id', () => {
  test('returns vacancy', async () => {
    const res = await request(app).get(`/api/vacancies/${vacId}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe(VACANCY.title);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/vacancies/99999');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/vacancies/:id', () => {
  test('updates and returns 200', async () => {
    const res = await request(app).put(`/api/vacancies/${vacId}`).send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.changes).toBe(1);
  });

  test('returns 400 when title missing', async () => {
    const res = await request(app).put(`/api/vacancies/${vacId}`).send({ description: 'x' });
    expect(res.status).toBe(400);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).put('/api/vacancies/99999').send({ title: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/vacancies/:id', () => {
  test('deletes and returns 200', async () => {
    const res = await request(app).delete(`/api/vacancies/${vacId}`);
    expect(res.status).toBe(200);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/vacancies/99999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/vacancies/:id/candidates/:candidateId', () => {
  test('adds candidate to vacancy', async () => {
    const res = await request(app).post(`/api/vacancies/${vacId}/candidates/${candId}`);
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/vacancies/:id/candidates/:candidateId', () => {
  test('removes candidate from vacancy', async () => {
    await request(app).post(`/api/vacancies/${vacId}/candidates/${candId}`);
    const res = await request(app).delete(`/api/vacancies/${vacId}/candidates/${candId}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/vacancies/:id/candidates', () => {
  test('returns candidates list', async () => {
    await request(app).post(`/api/vacancies/${vacId}/candidates/${candId}`);
    const res = await request(app).get(`/api/vacancies/${vacId}/candidates`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });
});

describe('GET /api/vacancies/:id/rank-candidates', () => {
  let vacWithTor;

  beforeEach(async () => {
    const torId = await createTor({ name: 'TOR', file_content: 'text' }, mockDb);
    const res = await request(app).post('/api/vacancies').send({ title: 'Role with TOR', tor_id: torId });
    vacWithTor = res.body.id;
  });

  test('returns candidates sorted by similarity', async () => {
    rankCandidatesByTor.mockResolvedValueOnce([
      { candidate_id: candId, similarity: 85 }
    ]);
    const res = await request(app).get(`/api/vacancies/${vacWithTor}/rank-candidates`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(candId);
    expect(res.body[0].similarity).toBe(85);
    expect(rankCandidatesByTor).toHaveBeenCalledWith(expect.any(Number), null, 30);
  });

  test('returns 422 if vacancy has no TOR', async () => {
    const res = await request(app).get(`/api/vacancies/${vacId}/rank-candidates`); // vacId has no TOR
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Vacancy has no TOR linked');
  });

  test('returns 404 for unknown vacancy', async () => {
    const res = await request(app).get('/api/vacancies/99999/rank-candidates');
    expect(res.status).toBe(404);
  });
});

describe('500 error handling', () => {
  beforeEach(() => { mockDb.close(); });

  test('POST returns 500', async () => {
    expect((await request(app).post('/api/vacancies').send({ title: 'X' })).status).toBe(500);
  });
  test('GET list returns 500', async () => {
    expect((await request(app).get('/api/vacancies')).status).toBe(500);
  });
  test('GET by id returns 500', async () => {
    expect((await request(app).get('/api/vacancies/1')).status).toBe(500);
  });
  test('PUT returns 500', async () => {
    expect((await request(app).put('/api/vacancies/1').send({ title: 'X' })).status).toBe(500);
  });
  test('DELETE returns 500', async () => {
    expect((await request(app).delete('/api/vacancies/1')).status).toBe(500);
  });
});
