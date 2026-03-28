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

describe('POST /api/vacancies/:id/candidates/add-all', () => {
  test('adds all candidates and returns ok', async () => {
    const res = await request(app).post(`/api/vacancies/${vacId}/candidates/add-all`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /api/vacancies/:id/rank', () => {
  let vacWithTorForRank;

  beforeEach(async () => {
    const torId = await (async () => {
      const { createTor } = require('../services/torService');
      return createTor({ name: 'TOR Rank', file_content: 'text' }, mockDb);
    })();
    const res = await request(app).post('/api/vacancies').send({ title: 'Role for Rank', tor_id: torId });
    vacWithTorForRank = res.body.id;
    await request(app).post(`/api/vacancies/${vacWithTorForRank}/candidates/${candId}`);
  });

  test('returns 404 for unknown vacancy', async () => {
    const res = await request(app).get('/api/vacancies/99999/rank');
    expect(res.status).toBe(404);
  });

  test('returns 422 when vacancy has no TOR', async () => {
    const res = await request(app).get(`/api/vacancies/${vacId}/rank`);
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Vacancy has no TOR linked');
  });

  test('returns empty array when no candidates', async () => {
    const res2 = await request(app).post('/api/vacancies').send({ title: 'Empty role', tor_id: 1 });
    const emptyVacId = res2.body.id;
    const res = await request(app).get(`/api/vacancies/${emptyVacId}/rank`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns ranked candidates array on success', async () => {
    rankCandidatesByTor.mockResolvedValueOnce([{ candidate_id: candId, similarity: 72 }]);
    const res = await request(app).get(`/api/vacancies/${vacWithTorForRank}/rank`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
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

describe('rank-candidates additional branches', () => {
  let vacWithTor2;
  beforeEach(async () => {
    const { createTor } = require('../services/torService');
    const torId = await createTor({ name: 'TOR2', file_content: 'text' }, mockDb);
    const res = await request(app).post('/api/vacancies').send({ title: 'Role2', tor_id: torId });
    vacWithTor2 = res.body.id;
  });

  test('returns empty array when rankCandidatesByTor returns nothing', async () => {
    rankCandidatesByTor.mockResolvedValueOnce([]);
    const res = await request(app).get(`/api/vacancies/${vacWithTor2}/rank-candidates`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
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
  test('POST add-all returns 500', async () => {
    expect((await request(app).post('/api/vacancies/1/candidates/add-all')).status).toBe(500);
  });
  test('GET candidates returns 500', async () => {
    expect((await request(app).get('/api/vacancies/1/candidates')).status).toBe(500);
  });
  test('POST add candidate returns 500', async () => {
    expect((await request(app).post('/api/vacancies/1/candidates/1')).status).toBe(500);
  });
  test('DELETE candidate returns 500', async () => {
    expect((await request(app).delete('/api/vacancies/1/candidates/1')).status).toBe(500);
  });
  test('GET rank returns 500', async () => {
    expect((await request(app).get('/api/vacancies/1/rank')).status).toBe(500);
  });
  test('GET rank-candidates returns 500', async () => {
    expect((await request(app).get('/api/vacancies/1/rank-candidates')).status).toBe(500);
  });
});
