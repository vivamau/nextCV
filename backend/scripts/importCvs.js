const ExcelJS = require('exceljs');
const path = require('path');
const {
  runMigrations, insertCandidate, upsertResume, insertSkills, clearCandidates,
} = require('../services/dbService');
const { indexCandidate } = require('../services/vectorService');

const XLSX_PATH = path.join(__dirname, '../data/cvs.xlsx');

async function importCvs() {
  console.log('Running migrations...');
  await runMigrations();

  console.log('Clearing existing candidates...');
  await clearCandidates();

  console.log('Reading Excel file...');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_PATH);
  const ws = workbook.worksheets[0];

  // Row 1 = section groups, Row 2 = column names, Row 3+ = data
  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 2) return; // skip both header rows
    const v = (i) => {
      const val = row.getCell(i).value;
      if (val === null || val === undefined) return null;
      const s = String(val).trim();
      return s || null;
    };
    rows.push({
      job_application:    v(1),
      type:               v(6),   // Internal / External
      wfp_jobs_applied:   v(9)  ? parseInt(v(9))  : null,
      skills_match_score: v(12),
      nationality:        v(13),
      gender:             v(16),
      age:                v(17) ? parseInt(v(17)) : null,
      language_skill:     v(41),
      mau_vote:           null,
      mau_comments:       null,
      luke_vote:          null,
      luke_comments:      null,
      resume_text:        v(39),
      skills_raw:         v(40),
    });
  });

  console.log(`Importing ${rows.length} candidates...`);
  for (const row of rows) {
    if (!row.job_application) continue;
    const id = await insertCandidate(row);
    if (row.resume_text) {
      await upsertResume(id, row.resume_text);
      // Index in vector DB for semantic search
      indexCandidate(id, row.resume_text).catch(() => {});
    }
    if (row.skills_raw) {
      const skills = row.skills_raw
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
      if (skills.length) await insertSkills(id, skills);
    }
  }

  console.log(`Done. Imported ${rows.length} candidates.`);
  process.exit(0);
}

importCvs().catch(err => { console.error(err); process.exit(1); });
