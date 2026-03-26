const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');

let mockDb;

jest.mock('../config/db', () => ({ getDb: () => mockDb }));

const {
  runMigrations, insertCandidate, upsertResume, insertSkills, clearCandidates,
} = require('../services/dbService');
const { indexCandidate } = require('../services/vectorService');
const candidateRoutes = require('../routes/candidateRoutes');

jest.mock('../services/vectorService', () => ({
  indexCandidate: jest.fn().mockResolvedValue(true)
}));

const app = express();
app.use(express.json());
app.use('/api/candidates', candidateRoutes);

const SAMPLE = {
  job_application: 'Alice Smith (C100001)',
  type: 'External',
  wfp_jobs_applied: 2,
  skills_match_score: 'Good',
  nationality: 'Kenya',
  gender: 'Female',
  age: 30,
  language_skill: 'English',
  mau_vote: 'Yes',
  mau_comments: 'Strong profile',
  luke_vote: 'Maybe',
  luke_comments: null,
};

let aliceId;

beforeEach(async () => {
  mockDb = new sqlite3.Database(':memory:');
  await runMigrations(mockDb);
  aliceId = await insertCandidate(SAMPLE, mockDb);
  await insertCandidate({ ...SAMPLE, job_application: 'Bob Jones (C100002)', gender: 'Male', nationality: 'Nigeria', mau_vote: 'No' }, mockDb);
  await upsertResume(aliceId, 'Alice resume text', mockDb);
  await insertSkills(aliceId, ['Python', 'SQL'], mockDb);
});

afterEach(async () => {
  try { await clearCandidates(mockDb); } catch (_) {}
  try { mockDb.close(); } catch (_) {}
});

// --- GET /api/candidates ---
describe('GET /api/candidates', () => {
  test('returns 200 with paginated data', async () => {
    const res = await request(app).get('/api/candidates');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('filters by gender', async () => {
    const res = await request(app).get('/api/candidates?gender=Female');
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].gender).toBe('Female');
  });

  test('filters by mau_vote', async () => {
    const res = await request(app).get('/api/candidates?mau_vote=Yes');
    expect(res.body.total).toBe(1);
  });

  test('search works', async () => {
    const res = await request(app).get('/api/candidates?search=Alice');
    expect(res.body.total).toBe(1);
  });

  test('sort and pagination accepted', async () => {
    const res = await request(app).get('/api/candidates?sort_by=age&sort_dir=desc&page=1&limit=1');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

// --- GET /api/candidates/stats ---
describe('GET /api/candidates/stats', () => {
  test('returns stats shape', async () => {
    const res = await request(app).get('/api/candidates/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(Array.isArray(res.body.nationalities)).toBe(true);
    expect(Array.isArray(res.body.genders)).toBe(true);
    expect(Array.isArray(res.body.mauVotes)).toBe(true);
    expect(Array.isArray(res.body.lukeVotes)).toBe(true);
    expect(Array.isArray(res.body.types)).toBe(true);
  });
});

// --- GET /api/candidates/:id ---
describe('GET /api/candidates/:id', () => {
  test('returns candidate data', async () => {
    const res = await request(app).get(`/api/candidates/${aliceId}`);
    expect(res.status).toBe(200);
    expect(res.body.candidate.id).toBe(aliceId);
    expect(res.body.resume).toBeDefined();
    expect(res.body.skills).toBeInstanceOf(Array);
    if (res.body.skills.length > 0) {
      expect(typeof res.body.skills[0]).toBe('string');
    }
    expect(res.body.vacancies).toBeDefined();
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/candidates/99999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});

// --- GET /api/candidates/:id/resume ---
describe('GET /api/candidates/:id/resume', () => {
  test('returns resume text', async () => {
    const res = await request(app).get(`/api/candidates/${aliceId}/resume`);
    expect(res.status).toBe(200);
    expect(res.body.resume_text).toBe('Alice resume text');
  });

  test('returns null resume_text when none exists', async () => {
    const list = await request(app).get('/api/candidates?search=Bob');
    const bobId = list.body.data[0].id;
    const res = await request(app).get(`/api/candidates/${bobId}/resume`);
    expect(res.status).toBe(200);
    expect(res.body.resume_text).toBeNull();
  });
});

// --- GET /api/candidates/:id/skills ---
describe('GET /api/candidates/:id/skills', () => {
  test('returns skills array', async () => {
    const res = await request(app).get(`/api/candidates/${aliceId}/skills`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toContain('Python');
    expect(res.body).toContain('SQL');
  });

  test('returns empty array when no skills', async () => {
    const list = await request(app).get('/api/candidates?search=Bob');
    const bobId = list.body.data[0].id;
    const res = await request(app).get(`/api/candidates/${bobId}/skills`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// --- POST /api/candidates/index-all ---
describe('POST /api/candidates/index-all', () => {
  beforeEach(() => {
    indexCandidate.mockClear();
  });

  test('returns 200 and indexes candidates with resumes', async () => {
    const res = await request(app).post('/api/candidates/index-all');
    expect(res.status).toBe(200);
    expect(res.body.indexed).toBe(1); // Alice has a resume, Bob doesn't
    expect(indexCandidate).toHaveBeenCalledWith(aliceId, 'Alice resume text');
  });
});

// --- POST /api/candidates/:id/index ---
describe('POST /api/candidates/:id/index', () => {
  beforeEach(() => {
    indexCandidate.mockClear();
  });

  test('returns 200 and indexes specific candidate', async () => {
    const res = await request(app).post(`/api/candidates/${aliceId}/index`);
    expect(res.status).toBe(200);
    expect(indexCandidate).toHaveBeenCalledWith(aliceId, 'Alice resume text');
  });

  test('returns 400 if candidate lacks resume data', async () => {
    const list = await request(app).get('/api/candidates?search=Bob');
    const bobId = list.body.data[0].id;
    const res = await request(app).post(`/api/candidates/${bobId}/index`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Candidate does not have resume text to index');
    expect(indexCandidate).not.toHaveBeenCalled();
  });

  test('returns 404 for non-existent candidate', async () => {
    const res = await request(app).post('/api/candidates/99999/index');
    expect(res.status).toBe(404);
  });
});

// --- 500 error paths ---
describe('500 error handling', () => {
  beforeEach(() => { mockDb.close(); });

  test('GET /api/candidates returns 500', async () => {
    const res = await request(app).get('/api/candidates');
    expect(res.status).toBe(500);
  });

  test('GET /api/candidates/stats returns 500', async () => {
    const res = await request(app).get('/api/candidates/stats');
    expect(res.status).toBe(500);
  });

  test('GET /api/candidates/:id returns 500', async () => {
    const res = await request(app).get('/api/candidates/1');
    expect(res.status).toBe(500);
  });

  test('GET /api/candidates/:id/resume returns 500', async () => {
    const res = await request(app).get('/api/candidates/1/resume');
    expect(res.status).toBe(500);
  });

  test('GET /api/candidates/:id/skills returns 500', async () => {
    const res = await request(app).get('/api/candidates/1/skills');
    expect(res.status).toBe(500);
  });
});
