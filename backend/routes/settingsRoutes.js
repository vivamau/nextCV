const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getSetting, setSetting, getAllSettings } = require('../services/settingsService');

// GET /api/settings/ollama/models?url=http://localhost:11434
router.get('/ollama/models', async (req, res) => {
  try {
    const url = req.query.url || await getSetting('ollama_url') || 'http://localhost:11434';
    const response = await axios.get(`${url}/api/tags`, { timeout: 5000 });
    const models = (response.data.models || []).map(m => m.name);
    res.json(models);
  } catch (err) {
    res.status(502).json({ error: `Cannot reach Ollama: ${err.message}` });
  }
});

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const settings = await getAllSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    const { llm_provider, llm_model, ollama_url, ollama_api_key } = req.body;

    if (!llm_provider) return res.status(400).json({ error: 'llm_provider is required' });
    if (llm_provider === 'ollama' && !llm_model) {
      return res.status(400).json({ error: 'llm_model is required when provider is ollama' });
    }

    await setSetting('llm_provider', llm_provider);
    await setSetting('llm_model', llm_model || '');
    if (ollama_url) await setSetting('ollama_url', ollama_url);
    await setSetting('ollama_api_key', ollama_api_key || '');

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
