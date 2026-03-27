const { getVectorDb } = require('../config/vectorDb');
const { generateEmbedding } = require('./embeddingService');

const CANDIDATES_TABLE = 'candidates_vectors';
const TORS_TABLE = 'tors_vectors';

function cosineSimilarity(v1, v2) {
  let dot = 0, n1 = 0, n2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    n1 += v1[i] * v1[i];
    n2 += v2[i] * v2[i];
  }
  const denominator = Math.sqrt(n1) * Math.sqrt(n2);
  if (denominator === 0) return 0;
  return dot / denominator;
}

async function upsertRecord(tableName, record) {
  const db = await getVectorDb();
  const tables = await db.tableNames();
  if (tables.includes(tableName)) {
    const tbl = await db.openTable(tableName);
    try { await tbl.delete(`id = ${record.id}`); } catch (_) {}
    await tbl.add([record]);
  } else {
    await db.createTable(tableName, [record]);
  }
}

async function indexCandidate(candidateId, resumeText, skillsText = '') {
  if (!resumeText || !resumeText.trim()) return false;
  
  const textToEmbed = `Resume Content:\n${resumeText}\n\nSkills:\n${skillsText}`;
  const vector = await generateEmbedding(textToEmbed);
  
  if (!vector || vector.length === 0) return false;
  await upsertRecord(CANDIDATES_TABLE, {
    vector,
    id: candidateId,
    snippet: resumeText.substring(0, 200),
  });
  return true;
}

async function indexTor(torId, torText, skillsText = '') {
  if (!torText || !torText.trim()) return false;
  
  const textToEmbed = `TOR Content:\n${torText}\n\nSkills:\n${skillsText}`;
  const vector = await generateEmbedding(textToEmbed);
  
  if (!vector || vector.length === 0) return false;
  await upsertRecord(TORS_TABLE, {
    vector,
    id: torId,
    snippet: torText.substring(0, 200),
  });
  return true;
}

async function rankCandidatesByTor(torId, candidateIds = null, limit = 50) {
  if (candidateIds !== null && (!Array.isArray(candidateIds) || candidateIds.length === 0)) return [];
  const db = await getVectorDb();
  const tables = await db.tableNames();
  if (!tables.includes(TORS_TABLE) || !tables.includes(CANDIDATES_TABLE)) return [];

  const torTbl = await db.openTable(TORS_TABLE);
  const torRows = await torTbl.filter(`id = ${torId}`).limit(1).execute();
  if (!torRows.length) return [];

  const torVector = torRows[0].vector;
  const candTbl = await db.openTable(CANDIDATES_TABLE);
  
  if (candidateIds !== null && candidateIds.length > 0) {
    // For specific IDs, fetch them all via filter and compute similarity manually
    // to avoid post-filtering issues in LanceDB ANN search
    const idList = candidateIds.join(',');
    const rows = await candTbl.filter(`id IN (${idList})`).limit(10000).execute();
    const ranked = rows.map(r => {
      const similarity = cosineSimilarity(torVector, r.vector);
      return {
        candidate_id: r.id,
        similarity: Math.max(0, Math.min(100, Math.round(similarity * 100))),
      };
    });
    // If specific IDs were requested, we usually want all of them for the vacancy list
    // but we still sort them by similarity.
    return ranked.sort((a, b) => b.similarity - a.similarity);
  }

  // Global search: Use LanceDB ANN search (works fine for finding top overall matches)
  const results = await candTbl.search(torVector)
    .metricType('cosine')
    .limit(limit)
    .execute();

  return results.map(r => ({
    candidate_id: r.id,
    similarity: Math.max(0, Math.round((1 - r._distance) * 100)),
  }));
}

module.exports = { indexCandidate, indexTor, rankCandidatesByTor, CANDIDATES_TABLE, TORS_TABLE };
