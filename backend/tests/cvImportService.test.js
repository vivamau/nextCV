jest.mock('exceljs');
const ExcelJS = require('exceljs');
const sqlite3 = require('sqlite3').verbose();
const { runMigrations } = require('../services/dbService');
const { parseExcelBuffer, importCvsForVacancy } = require('../services/cvImportService');

// --- ExcelJS mock setup ---
const mockEachRow = jest.fn();
const mockLoad = jest.fn().mockResolvedValue(undefined);
ExcelJS.Workbook.mockImplementation(() => ({
  xlsx: { load: mockLoad },
  worksheets: [{ eachRow: mockEachRow }],
}));

// Helper: simulate eachRow with an array of cell-maps (1-indexed)
function stubRows(rowsData) {
  mockEachRow.mockImplementation((_opts, callback) => {
    rowsData.forEach((cells, i) => {
      const row = {
        getCell: (idx) => ({ value: cells[idx] !== undefined ? cells[idx] : null }),
      };
      callback(row, i + 1);
    });
  });
}

afterEach(() => jest.clearAllMocks());

// --- parseExcelBuffer ---
describe('parseExcelBuffer', () => {
  test('skips the first 2 header rows', async () => {
    stubRows([
      { 1: 'SectionGroup' },
      { 1: 'ColumnName' },
      { 1: 'Alice (C001)', 6: 'External' },
    ]);
    const result = await parseExcelBuffer(Buffer.from(''));
    expect(result).toHaveLength(1);
    expect(result[0].job_application).toBe('Alice (C001)');
  });

  test('filters out rows with no job_application', async () => {
    stubRows([
      { 1: 'H1' },
      { 1: 'H2' },
      { 1: null, 6: 'External' },
      { 1: '   ', 6: 'External' },
    ]);
    const result = await parseExcelBuffer(Buffer.from(''));
    expect(result).toHaveLength(0);
  });

  test('maps column indices correctly', async () => {
    stubRows([
      { 1: 'H1' },
      { 1: 'H2' },
      {
        1: 'Bob (C002)',
        6: 'Internal',
        9: '3',
        12: 'Excellent',
        13: 'Uganda',
        16: 'Male',
        17: '25',
        39: 'Resume text here',
        40: 'Python\nSQL',
        41: 'French',
      },
    ]);
    const result = await parseExcelBuffer(Buffer.from(''));
    expect(result).toHaveLength(1);
    const r = result[0];
    expect(r.job_application).toBe('Bob (C002)');
    expect(r.type).toBe('Internal');
    expect(r.wfp_jobs_applied).toBe(3);
    expect(r.skills_match_score).toBe('Excellent');
    expect(r.nationality).toBe('Uganda');
    expect(r.gender).toBe('Male');
    expect(r.age).toBe(25);
    expect(r.resume_text).toBe('Resume text here');
    expect(r.skills_raw).toBe('Python\nSQL');
    expect(r.language_skill).toBe('French');
  });

  test('handles null/empty cells gracefully', async () => {
    stubRows([
      { 1: 'H1' },
      { 1: 'H2' },
      { 1: 'Carol (C003)' },
    ]);
    const result = await parseExcelBuffer(Buffer.from(''));
    expect(result[0].type).toBeNull();
    expect(result[0].age).toBeNull();
    expect(result[0].resume_text).toBeNull();
    expect(result[0].skills_raw).toBeNull();
  });

  test('trims whitespace from cell values', async () => {
    stubRows([
      { 1: 'H1' },
      { 1: 'H2' },
      { 1: '  Dave (C004)  ', 6: '  External  ' },
    ]);
    const result = await parseExcelBuffer(Buffer.from(''));
    expect(result[0].job_application).toBe('Dave (C004)');
    expect(result[0].type).toBe('External');
  });

  test('parses integer fields correctly', async () => {
    stubRows([
      { 1: 'H1' },
      { 1: 'H2' },
      { 1: 'Eve (C005)', 9: '5', 17: '40' },
    ]);
    const result = await parseExcelBuffer(Buffer.from(''));
    expect(result[0].wfp_jobs_applied).toBe(5);
    expect(result[0].age).toBe(40);
  });

  test('returns empty array when no data rows', async () => {
    stubRows([{ 1: 'H1' }, { 1: 'H2' }]);
    const result = await parseExcelBuffer(Buffer.from(''));
    expect(result).toHaveLength(0);
  });

  test('calls workbook.xlsx.load with the provided buffer', async () => {
    stubRows([{ 1: 'H1' }, { 1: 'H2' }]);
    const buf = Buffer.from('test');
    await parseExcelBuffer(buf);
    expect(mockLoad).toHaveBeenCalledWith(buf);
  });
});

// --- importCvsForVacancy ---
describe('importCvsForVacancy', () => {
  let db, vacancyId;

  beforeEach(async () => {
    db = new sqlite3.Database(':memory:');
    await runMigrations(db);
    vacancyId = await new Promise((res, rej) =>
      db.run('INSERT INTO vacancies (title) VALUES (?)', ['Test Vacancy'], function (err) {
        err ? rej(err) : res(this.lastID);
      })
    );
  });

  afterEach(() => { try { db.close(); } catch (_) {} });

  const makeRow = (overrides = {}) => ({
    job_application: 'Alice (C001)',
    type: 'External',
    nationality: 'Kenya',
    gender: 'Female',
    age: 30,
    language_skill: 'English',
    wfp_jobs_applied: 1,
    skills_match_score: 'Good',
    resume_text: null,
    skills_raw: null,
    ...overrides,
  });

  test('creates new candidate and links to vacancy', async () => {
    const result = await importCvsForVacancy([makeRow()], vacancyId, db);
    expect(result.imported).toBe(1);
    expect(result.linked).toBe(1);

    const cand = await new Promise((res, rej) =>
      db.get('SELECT * FROM candidates WHERE job_application = ?', ['Alice (C001)'], (err, row) => err ? rej(err) : res(row))
    );
    expect(cand).toBeTruthy();

    const link = await new Promise((res, rej) =>
      db.get('SELECT * FROM candidates_to_vacancies WHERE candidate_id = ? AND vacancy_id = ?', [cand.id, vacancyId], (err, row) => err ? rej(err) : res(row))
    );
    expect(link).toBeTruthy();
  });

  test('reuses existing candidate when job_application matches', async () => {
    const existingId = await new Promise((res, rej) =>
      db.run('INSERT INTO candidates (job_application, type) VALUES (?, ?)', ['Alice (C001)', 'External'], function (err) {
        err ? rej(err) : res(this.lastID);
      })
    );

    await importCvsForVacancy([makeRow()], vacancyId, db);

    const count = await new Promise((res, rej) =>
      db.get('SELECT COUNT(*) as cnt FROM candidates WHERE job_application = ?', ['Alice (C001)'], (err, row) => err ? rej(err) : res(row.cnt))
    );
    expect(count).toBe(1);

    const link = await new Promise((res, rej) =>
      db.get('SELECT * FROM candidates_to_vacancies WHERE candidate_id = ? AND vacancy_id = ?', [existingId, vacancyId], (err, row) => err ? rej(err) : res(row))
    );
    expect(link).toBeTruthy();
  });

  test('saves resume text when provided', async () => {
    await importCvsForVacancy([makeRow({ resume_text: 'Bob has Python skills' })], vacancyId, db);

    const cand = await new Promise((res, rej) =>
      db.get('SELECT id FROM candidates WHERE job_application = ?', ['Alice (C001)'], (err, row) => err ? rej(err) : res(row))
    );
    const resume = await new Promise((res, rej) =>
      db.get('SELECT resume_text FROM candidate_resumes WHERE candidate_id = ?', [cand.id], (err, row) => err ? rej(err) : res(row))
    );
    expect(resume.resume_text).toBe('Bob has Python skills');
  });

  test('saves skills from skills_raw when provided', async () => {
    await importCvsForVacancy([makeRow({ skills_raw: 'Python\nSQL\nProject Management' })], vacancyId, db);

    const cand = await new Promise((res, rej) =>
      db.get('SELECT id FROM candidates WHERE job_application = ?', ['Alice (C001)'], (err, row) => err ? rej(err) : res(row))
    );
    const skills = await new Promise((res, rej) =>
      db.all('SELECT skill FROM candidate_skills WHERE candidate_id = ?', [cand.id], (err, rows) => err ? rej(err) : res(rows))
    );
    expect(skills.map(s => s.skill)).toContain('Python');
    expect(skills.map(s => s.skill)).toContain('SQL');
  });

  test('handles empty rows array', async () => {
    const result = await importCvsForVacancy([], vacancyId, db);
    expect(result.imported).toBe(0);
    expect(result.linked).toBe(0);
  });

  test('does not duplicate candidate-vacancy link when imported twice', async () => {
    const rows = [makeRow({ job_application: 'Dave (C004)' })];
    await importCvsForVacancy(rows, vacancyId, db);
    await importCvsForVacancy(rows, vacancyId, db);

    const count = await new Promise((res, rej) =>
      db.get('SELECT COUNT(*) as cnt FROM candidates_to_vacancies WHERE vacancy_id = ?', [vacancyId], (err, row) => err ? rej(err) : res(row.cnt))
    );
    expect(count).toBe(1);
  });

  test('imports multiple rows and returns correct counts', async () => {
    const rows = [
      makeRow({ job_application: 'Cand1 (C101)' }),
      makeRow({ job_application: 'Cand2 (C102)' }),
      makeRow({ job_application: 'Cand3 (C103)' }),
    ];
    const result = await importCvsForVacancy(rows, vacancyId, db);
    expect(result.imported).toBe(3);
    expect(result.linked).toBe(3);
  });

  test('skips resume upsert when resume_text is null', async () => {
    await importCvsForVacancy([makeRow({ resume_text: null })], vacancyId, db);

    const cand = await new Promise((res, rej) =>
      db.get('SELECT id FROM candidates WHERE job_application = ?', ['Alice (C001)'], (err, row) => err ? rej(err) : res(row))
    );
    const resume = await new Promise((res, rej) =>
      db.get('SELECT * FROM candidate_resumes WHERE candidate_id = ?', [cand.id], (err, row) => err ? rej(err) : res(row))
    );
    expect(resume).toBeFalsy();
  });
});
