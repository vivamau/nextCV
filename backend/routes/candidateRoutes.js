const express = require('express');
const router = express.Router();
const { getCandidates, getCandidateById, getStats, getResumeByCandidate, getSkillsByCandidate, getAllCandidatesForIndexing, insertSkills, insertLinks, getLinksByCandidate } = require('../services/dbService');
const { indexCandidate, rankCandidatesByTor } = require('../services/vectorService');
const { getVacanciesForCandidate } = require('../services/vacancyService');
const { extractSkillsFromResume, extractLinksFromResume } = require('../services/llmService');
const { getAllSettings } = require('../services/settingsService');
const { getSkillOverlap } = require('../utilities/skillMatcher');
const { logTokenUsage } = require('../services/tokenService');
const { getDb } = require('../config/db');

// GET /api/candidates?search=&nationality=&gender=&mau_vote=&luke_vote=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const result = await getCandidates(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/candidates/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/candidates/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const candidate = await getCandidateById(id);
    if (!candidate) return res.status(404).json({ error: 'Not found' });
    
    const resume = await getResumeByCandidate(id);
    const skills = await getSkillsByCandidate(id);
    const vacancies = await getVacanciesForCandidate(id);

    // Augment vacancies with similarity and skills match string
    const db = getDb();
    const augmentedVacancies = await Promise.all(vacancies.map(async (v) => {
      let similarity = null;
      if (v.tor_id) {
        const ranks = await rankCandidatesByTor(v.tor_id, [id]);
        if (ranks.length > 0) similarity = ranks[0].similarity;
      }

      // Also get the exact matched skills for this vacancy
      const vTorSkills = !v.tor_id ? [] : await new Promise((res, rej) => {
        db.all('SELECT skill FROM tor_skills WHERE tor_id = ?', [v.tor_id], (err, rows) => 
          err ? rej(err) : res(rows.map(r => r.skill))
        );
      });

      const matched = getSkillOverlap(skills.map(s => s.skill), vTorSkills);
      return { ...v, similarity, matched_skills: matched.join(', ') };
    }));

    res.json({
      candidate,
      resume,
      skills,
      vacancies: augmentedVacancies
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/candidates/:id/resume
router.get('/:id/resume', async (req, res) => {
  try {
    const resume = await getResumeByCandidate(req.params.id);
    res.json(resume || { resume_text: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/candidates/:id/skills
router.get('/:id/skills', async (req, res) => {
  try {
    const skills = await getSkillsByCandidate(req.params.id);
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/candidates/index-all
router.post('/index-all', async (req, res) => {
  try {
    const list = await getAllCandidatesForIndexing();
    let indexed = 0;
    for (const cand of list) {
      const ok = await indexCandidate(cand.id, cand.resume_text, cand.skills);
      if (ok) indexed++;
    }
    res.json({ indexed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/candidates/:id/index
router.post('/:id/index', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cand = await getCandidateById(id);
    if (!cand) return res.status(404).json({ error: 'Not found' });
    
    const resume = await getResumeByCandidate(id);
    if (!resume || !resume.resume_text) {
      return res.status(400).json({ error: 'Candidate does not have resume text to index' });
    }
    
    const skills = await getSkillsByCandidate(id);
    await indexCandidate(id, resume.resume_text, skills.map(s => s.skill).join(', '));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/candidates/:id/extract-skills
router.post('/:id/extract-skills', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cand = await getCandidateById(id);
    if (!cand) return res.status(404).json({ error: 'Not found' });

    const resume = await getResumeByCandidate(id);
    if (!resume || !resume.resume_text || !resume.resume_text.trim()) {
      return res.status(400).json({ error: 'Candidate does not have resume text to analyse' });
    }

    const settings = await getAllSettings();
    if (!settings.llm_provider || settings.llm_provider === 'none') {
      return res.status(422).json({ error: 'No LLM provider configured. Go to Settings to select one.' });
    }

    let skills;
    let promptTokens = 0, completionTokens = 0;
    try {
      const result = await extractSkillsFromResume(resume.resume_text, {
        ollamaUrl: settings.ollama_url || 'http://localhost:11434',
        model: settings.llm_model,
        apiKey: settings.ollama_api_key || null,
      });
      skills = result.skills;
      promptTokens = result.promptTokens;
      completionTokens = result.completionTokens;
    } catch (llmErr) {
      return res.status(502).json({ error: `LLM error: ${llmErr.message}` });
    }

    await logTokenUsage({
      provider: settings.llm_provider,
      model: settings.llm_model,
      operation: 'extract_skills',
      promptTokens,
      completionTokens,
    });
    await insertSkills(id, skills, true);
    // Explicitly re-index after extraction so search picks up new skills
    await indexCandidate(id, resume.resume_text, skills.join(', '));
    res.json({ skills });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/candidates/:id/extract-links
router.post('/:id/extract-links', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cand = await getCandidateById(id);
    if (!cand) return res.status(404).json({ error: 'Not found' });

    const resume = await getResumeByCandidate(id);
    if (!resume || !resume.resume_text || !resume.resume_text.trim()) {
      return res.status(400).json({ error: 'Candidate does not have resume text to analyse' });
    }

    const settings = await getAllSettings();
    if (!settings.llm_provider || settings.llm_provider === 'none') {
      return res.status(422).json({ error: 'No LLM provider configured. Go to Settings to select one.' });
    }

    let links;
    let promptTokens = 0, completionTokens = 0;
    try {
      const result = await extractLinksFromResume(resume.resume_text, {
        ollamaUrl: settings.ollama_url || 'http://localhost:11434',
        model: settings.llm_model,
        apiKey: settings.ollama_api_key || null,
      });
      links = result.links;
      promptTokens = result.promptTokens;
      completionTokens = result.completionTokens;
    } catch (llmErr) {
      return res.status(502).json({ error: `LLM error: ${llmErr.message}` });
    }

    await logTokenUsage({
      provider: settings.llm_provider,
      model: settings.llm_model,
      operation: 'extract_links',
      promptTokens,
      completionTokens,
    });
    await insertLinks(id, links);
    res.json({ links });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/candidates/:id/links
router.get('/:id/links', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cand = await getCandidateById(id);
    if (!cand) return res.status(404).json({ error: 'Not found' });

    const links = await getLinksByCandidate(id);
    res.json(links);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
