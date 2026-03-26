const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createTor, getTors, getTorById, updateTor, deleteTor } = require('../services/torService');
const { replaceTorSkills, getTorSkills } = require('../services/torSkillsService');
const { extractSkillsFromTor } = require('../services/llmService');
const { getAllSettings } = require('../services/settingsService');
const { extractTextFromBuffer } = require('../utilities/extractText');
const { indexTor } = require('../services/vectorService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/tors  (multipart or JSON)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { name, description, va_link } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

    const file_name    = req.file ? req.file.originalname : (req.body.file_name || null);
    const file_content = req.file
      ? await extractTextFromBuffer(req.file.buffer, req.file.originalname)
      : (req.body.file_content || null);

    const id = await createTor({ name: name.trim(), description, va_link, file_name, file_content });
    // Index in vector DB asynchronously — don't block the response
    if (file_content) indexTor(id, file_content).catch(() => {});
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tors
router.get('/', async (req, res) => {
  try {
    const tors = await getTors();
    res.json(tors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tors/:id
router.get('/:id', async (req, res) => {
  try {
    const tor = await getTorById(req.params.id);
    if (!tor) return res.status(404).json({ error: 'Not found' });
    res.json(tor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tors/:id  (multipart or JSON)
router.put('/:id', upload.single('file'), async (req, res) => {
  try {
    const { name, description, va_link } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

    const file_name    = req.file ? req.file.originalname : (req.body.file_name || null);
    const file_content = req.file
      ? await extractTextFromBuffer(req.file.buffer, req.file.originalname)
      : (req.body.file_content || null);

    const changes = await updateTor(req.params.id, { name: name.trim(), description, va_link, file_name, file_content });
    if (!changes) return res.status(404).json({ error: 'Not found' });
    res.json({ changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tors/:id
router.delete('/:id', async (req, res) => {
  try {
    const changes = await deleteTor(req.params.id);
    if (!changes) return res.status(404).json({ error: 'Not found' });
    res.json({ changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tors/:id/extract-skills
router.post('/:id/extract-skills', async (req, res) => {
  try {
    const tor = await getTorById(req.params.id);
    if (!tor) return res.status(404).json({ error: 'Not found' });
    if (!tor.file_content || !tor.file_content.trim()) {
      return res.status(400).json({ error: 'No text content in this TOR to analyse' });
    }

    const settings = await getAllSettings();
    if (!settings.llm_provider || settings.llm_provider === 'none') {
      return res.status(422).json({ error: 'No LLM provider configured. Go to Settings to select one.' });
    }

    let skills;
    try {
      skills = await extractSkillsFromTor(tor.file_content, {
        ollamaUrl: settings.ollama_url || 'http://localhost:11434',
        model: settings.llm_model,
        apiKey: settings.ollama_api_key || null,
      });
    } catch (llmErr) {
      return res.status(502).json({ error: `LLM error: ${llmErr.message}` });
    }

    await replaceTorSkills(req.params.id, skills);
    res.json({ skills });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tors/:id/skills
router.get('/:id/skills', async (req, res) => {
  try {
    const skills = await getTorSkills(req.params.id);
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tors/:id/skills
router.put('/:id/skills', async (req, res) => {
  try {
    const { skills } = req.body;
    if (!Array.isArray(skills)) return res.status(400).json({ error: 'skills array is required' });
    await replaceTorSkills(req.params.id, skills);
    res.json({ success: true, skills });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
