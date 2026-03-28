const ExcelJS = require('exceljs');
const { findOrCreateCandidate, upsertResume, insertSkills } = require('./dbService');
const { addCandidateToVacancy } = require('./vacancyService');

async function parseExcelBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const ws = workbook.worksheets[0];

  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 2) return; // skip 2-row header (section groups + column names)
    const v = (i) => {
      const val = row.getCell(i).value;
      if (val === null || val === undefined) return null;
      const s = String(val).trim();
      return s || null;
    };
    rows.push({
      job_application:    v(1),
      type:               v(6),
      wfp_jobs_applied:   v(9)  ? parseInt(v(9))  : null,
      skills_match_score: v(12),
      nationality:        v(13),
      gender:             v(16),
      age:                v(17) ? parseInt(v(17)) : null,
      resume_text:        v(39),
      skills_raw:         v(40),
      language_skill:     v(41),
    });
  });

  return rows.filter(r => r.job_application);
}

async function importCvsForVacancy(rows, vacancyId, db) {
  let imported = 0;
  let linked = 0;

  for (const row of rows) {
    const candidateId = await findOrCreateCandidate({
      job_application:    row.job_application,
      type:               row.type || null,
      wfp_jobs_applied:   row.wfp_jobs_applied || null,
      skills_match_score: row.skills_match_score || null,
      nationality:        row.nationality || null,
      gender:             row.gender || null,
      age:                row.age || null,
      language_skill:     row.language_skill || null,
      mau_vote:           null,
      mau_comments:       null,
      luke_vote:          null,
      luke_comments:      null,
    }, db);

    imported++;

    if (row.resume_text) {
      await upsertResume(candidateId, row.resume_text, db);
    }

    if (row.skills_raw) {
      const skills = row.skills_raw.split('\n').map(s => s.trim()).filter(Boolean);
      if (skills.length) await insertSkills(candidateId, skills, false, db);
    }

    await addCandidateToVacancy(candidateId, vacancyId, db);
    linked++;
  }

  return { imported, linked };
}

module.exports = { parseExcelBuffer, importCvsForVacancy };
