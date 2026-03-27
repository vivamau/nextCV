const express = require('express');
const router = express.Router();
const {
  createVacancy, getVacancies, getVacancyById, updateVacancy, deleteVacancy,
  addCandidateToVacancy, removeCandidateFromVacancy, getCandidatesForVacancy,
  addAllCandidatesToVacancy,
} = require('../services/vacancyService');
const { getCandidateById: getCandById } = require('../services/dbService');
const { rankCandidatesByTor } = require('../services/vectorService');

router.post('/', async (req, res) => {
  try {
    const { title, description, tor_id, opened_at, closed_at } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
    const id = await createVacancy({ title: title.trim(), description, tor_id, opened_at, closed_at });
    res.status(201).json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', async (req, res) => {
  try { res.json(await getVacancies()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const v = await getVacancyById(req.params.id);
    if (!v) return res.status(404).json({ error: 'Not found' });
    res.json(v);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description, tor_id, opened_at, closed_at } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
    const changes = await updateVacancy(req.params.id, { title: title.trim(), description, tor_id, opened_at, closed_at });
    if (!changes) return res.status(404).json({ error: 'Not found' });
    res.json({ changes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const changes = await deleteVacancy(req.params.id);
    if (!changes) return res.status(404).json({ error: 'Not found' });
    res.json({ changes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/candidates/:candidateId', async (req, res) => {
  try {
    await addCandidateToVacancy(req.params.candidateId, req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id/candidates/:candidateId', async (req, res) => {
  try {
    await removeCandidateFromVacancy(req.params.candidateId, req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/candidates/add-all', async (req, res) => {
  try {
    const count = await addAllCandidatesToVacancy(req.params.id);
    res.json({ ok: true, count });
  } catch (err) {
    console.error('Error in add-all route:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/candidates', async (req, res) => {
  try { res.json(await getCandidatesForVacancy(req.params.id)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/vacancies/:id/rank — semantic similarity ranking via vector DB
router.get('/:id/rank', async (req, res) => {
  try {
    const vacancy = await getVacancyById(req.params.id);
    if (!vacancy) return res.status(404).json({ error: 'Not found' });
    if (!vacancy.tor_id) return res.status(422).json({ error: 'Vacancy has no TOR linked' });

    const candidates = await getCandidatesForVacancy(req.params.id);
    if (!candidates.length) return res.json([]);

    const ranked = await rankCandidatesByTor(
      vacancy.tor_id,
      candidates.map(c => c.id)
    );
    res.json(ranked);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/vacancies/:id/rank-candidates — rank all candidates in the DB against this vacancy's TOR
router.get('/:id/rank-candidates', async (req, res) => {
  try {
    const vacancy = await getVacancyById(req.params.id);
    if (!vacancy) return res.status(404).json({ error: 'Not found' });
    if (!vacancy.tor_id) return res.status(422).json({ error: 'Vacancy has no TOR linked' });

    const ranked = await rankCandidatesByTor(vacancy.tor_id, null, 30); // Top 30 matches
    if (!ranked.length) return res.json([]);

    // Fetch full candidate metadata
    const candidates = await Promise.all(
      ranked.map(r => getCandById(r.candidate_id))
    );

    const result = candidates
      .filter(c => c !== null)
      .map(c => {
        const scoreObj = ranked.find(r => r.candidate_id === c.id);
        return { ...c, similarity: scoreObj.similarity };
      })
      .sort((a, b) => b.similarity - a.similarity);

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
