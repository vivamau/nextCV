/**
 * Backfill script: indexes all candidates that have resume text into LanceDB.
 * Run once after adding vector support: node scripts/indexCandidates.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { getDb } = require('../config/db');
const { runMigrations } = require('../services/dbService');
const { indexCandidate } = require('../services/vectorService');

async function run() {
  await runMigrations();
  const db = getDb();

  const rows = await new Promise((res, rej) =>
    db.all(
      `SELECT c.id, cr.resume_text
       FROM candidates c
       JOIN candidate_resumes cr ON cr.candidate_id = c.id
       WHERE cr.resume_text IS NOT NULL AND cr.resume_text != ''`,
      (e, r) => e ? rej(e) : res(r)
    )
  );

  console.log(`Found ${rows.length} candidates with resume text to index.`);
  let ok = 0, skip = 0;

  for (const row of rows) {
    const result = await indexCandidate(row.id, row.resume_text);
    if (result) { ok++; process.stdout.write('.'); }
    else { skip++; process.stdout.write('x'); }
  }

  console.log(`\nDone. Indexed: ${ok}, Skipped (no embedding): ${skip}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
