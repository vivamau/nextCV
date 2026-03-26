const { getCandidatesForVacancy, getVacancies } = require('./backend/services/vacancyService');
async function run() {
  const vacancies = await getVacancies();
  for (const v of vacancies) {
    const c = await getCandidatesForVacancy(v.id);
    if (c.length) {
      console.log(`Vacancy ${v.id} Candidates:`, c.map(cand => ({ id: cand.id, skills: cand.matched_skills, count: cand.skill_match_count })));
    }
  }
}
run();
