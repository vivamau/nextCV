jest.mock('../config/vectorDb');
jest.mock('../services/embeddingService');

const { getVectorDb } = require('../config/vectorDb');
const { generateEmbedding } = require('../services/embeddingService');
const { indexCandidate, indexTor, rankCandidatesByTor, CANDIDATES_TABLE, TORS_TABLE } = require('../services/vectorService');

const MOCK_VECTOR = new Array(768).fill(0.1);

// --- Mock LanceDB table ---
function makeMockTable(rows = []) {
  const tbl = {
    _rows: rows,
    delete: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue(undefined),
    filter: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(rows),
    }),
    search: jest.fn().mockReturnValue({
      metricType: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(rows),
    }),
  };
  return tbl;
}

function makeMockDb(tableNames = [], tables = {}) {
  return {
    tableNames: jest.fn().mockResolvedValue(tableNames),
    openTable: jest.fn().mockImplementation((name) => Promise.resolve(tables[name] || makeMockTable())),
    createTable: jest.fn().mockResolvedValue(undefined),
  };
}

afterEach(() => jest.clearAllMocks());

// --- indexCandidate ---
describe('indexCandidate', () => {
  test('returns false when resumeText is empty', async () => {
    expect(await indexCandidate(1, '')).toBe(false);
    expect(await indexCandidate(1, null)).toBe(false);
  });

  test('returns false when embedding fails', async () => {
    generateEmbedding.mockResolvedValueOnce(null);
    const db = makeMockDb([]);
    getVectorDb.mockResolvedValue(db);
    expect(await indexCandidate(1, 'resume text')).toBe(false);
    getVectorDb.mockReset();
  });

  test('creates table on first index', async () => {
    generateEmbedding.mockResolvedValueOnce(MOCK_VECTOR);
    const db = makeMockDb([]);
    getVectorDb.mockResolvedValue(db);
    const result = await indexCandidate(1, 'resume text');
    expect(result).toBe(true);
    expect(db.createTable).toHaveBeenCalledWith(CANDIDATES_TABLE, expect.any(Array));
    getVectorDb.mockReset();
  });

  test('upserts into existing table', async () => {
    generateEmbedding.mockResolvedValueOnce(MOCK_VECTOR);
    const tbl = makeMockTable();
    const db = makeMockDb([CANDIDATES_TABLE], { [CANDIDATES_TABLE]: tbl });
    getVectorDb.mockResolvedValue(db);
    const result = await indexCandidate(1, 'resume text');
    expect(result).toBe(true);
    expect(tbl.delete).toHaveBeenCalled();
    expect(tbl.add).toHaveBeenCalled();
    getVectorDb.mockReset();
  });

  test('passes text to generateEmbedding (cleaning handled by embeddingService)', async () => {
    const longText = 'a'.repeat(10000);
    generateEmbedding.mockResolvedValueOnce(MOCK_VECTOR);
    const db = makeMockDb([]);
    getVectorDb.mockResolvedValue(db);
    await indexCandidate(1, longText);
    expect(generateEmbedding).toHaveBeenCalledWith(longText);
    getVectorDb.mockReset();
  });
});

// --- indexTor ---
describe('indexTor', () => {
  test('returns false when torText is empty', async () => {
    expect(await indexTor(1, '')).toBe(false);
  });

  test('returns false when embedding fails', async () => {
    generateEmbedding.mockResolvedValueOnce(null);
    getVectorDb.mockResolvedValue(makeMockDb([]));
    expect(await indexTor(1, 'tor text')).toBe(false);
    getVectorDb.mockReset();
  });

  test('creates table and returns true', async () => {
    generateEmbedding.mockResolvedValueOnce(MOCK_VECTOR);
    const db = makeMockDb([]);
    getVectorDb.mockResolvedValue(db);
    expect(await indexTor(1, 'tor text')).toBe(true);
    expect(db.createTable).toHaveBeenCalledWith(TORS_TABLE, expect.any(Array));
    getVectorDb.mockReset();
  });
});

// --- rankCandidatesByTor ---
describe('rankCandidatesByTor', () => {
  test('returns empty array when candidateIds is empty array', async () => {
    expect(await rankCandidatesByTor(1, [])).toEqual([]);
  });

  test('searches all candidates when candidateIds is null', async () => {
    const torRow = { id: 1, vector: MOCK_VECTOR };
    const torTbl = {
      filter: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([torRow]),
      }),
    };
    const candResults = [ { id: 10, _distance: 0.1 } ];
    const candSearchQuery = {
      metricType: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(candResults),
    };

    const candTbl = { search: jest.fn().mockReturnValue(candSearchQuery) };
    const db = {
      tableNames: jest.fn().mockResolvedValue([TORS_TABLE, CANDIDATES_TABLE]),
      openTable: jest.fn().mockImplementation((name) => Promise.resolve(name === TORS_TABLE ? torTbl : candTbl)),
    };
    getVectorDb.mockResolvedValue(db);
    
    const results = await rankCandidatesByTor(1, null);
    expect(results).toHaveLength(1);
    expect(candSearchQuery.limit).toHaveBeenCalledWith(50);
    getVectorDb.mockReset();
  });

  test('returns empty array when tables do not exist', async () => {
    getVectorDb.mockResolvedValue(makeMockDb([]));
    expect(await rankCandidatesByTor(1, [1, 2])).toEqual([]);
    getVectorDb.mockReset();
  });

  test('returns empty array when TOR not indexed', async () => {
    const torTbl = {
      filter: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([]),
      }),
    };
    const db = makeMockDb([TORS_TABLE, CANDIDATES_TABLE], { [TORS_TABLE]: torTbl });
    getVectorDb.mockResolvedValue(db);
    expect(await rankCandidatesByTor(1, [1, 2])).toEqual([]);
    getVectorDb.mockReset();
  });

  test('returns ranked candidates with similarity score', async () => {
    const torRow = { id: 1, vector: MOCK_VECTOR };
    const torTbl = {
      filter: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([torRow]),
      }),
    };
    const candRows = [
      { id: 10, vector: MOCK_VECTOR }, // 100% match
      { id: 20, vector: new Array(768).fill(0) }, // 0% match
    ];
    const candTbl = {
      filter: jest.fn().mockReturnValue({
        execute: jest.fn().mockResolvedValue(candRows),
      }),
    };
    const db = {
      tableNames: jest.fn().mockResolvedValue([TORS_TABLE, CANDIDATES_TABLE]),
      openTable: jest.fn().mockImplementation((name) =>
        Promise.resolve(name === TORS_TABLE ? torTbl : candTbl)
      ),
    };
    getVectorDb.mockResolvedValue(db);
    const results = await rankCandidatesByTor(1, [10, 20]);
    expect(results).toHaveLength(2);
    expect(results[0].candidate_id).toBe(10);
    expect(results[0].similarity).toBe(100); 
    expect(results[1].similarity).toBe(0);
    getVectorDb.mockReset();
  });
});
