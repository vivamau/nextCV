const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getSetting, setSetting, getAllSettings } = require('../services/settingsService');
const { getTokenSummary, getTokenUsage } = require('../services/tokenService');

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

// GET /api/settings/openrouter/models
router.get('/openrouter/models', async (req, res) => {
  try {
    const apiKey = req.query.api_key || await getSetting('openrouter_api_key') || '';
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    const response = await axios.get('https://openrouter.ai/api/v1/models', { timeout: 10000, headers });
    const models = (response.data?.data || []).map(m => m.id).filter(Boolean).sort();
    res.json(models);
  } catch (err) {
    res.status(502).json({ error: `Cannot reach OpenRouter: ${err.message}` });
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
    const {
      llm_provider, llm_model, ollama_url, ollama_api_key,
      openrouter_api_key, openrouter_model,
    } = req.body;

    if (!llm_provider) return res.status(400).json({ error: 'llm_provider is required' });
    if (llm_provider === 'ollama' && !llm_model) {
      return res.status(400).json({ error: 'llm_model is required when provider is ollama' });
    }
    if (llm_provider === 'openrouter') {
      if (!openrouter_api_key) return res.status(400).json({ error: 'openrouter_api_key is required when provider is openrouter' });
      if (!openrouter_model) return res.status(400).json({ error: 'openrouter_model is required when provider is openrouter' });
    }

    await setSetting('llm_provider', llm_provider);
    await setSetting('llm_model', llm_model || '');
    if (ollama_url) await setSetting('ollama_url', ollama_url);
    await setSetting('ollama_api_key', ollama_api_key || '');
    if (openrouter_api_key !== undefined) await setSetting('openrouter_api_key', openrouter_api_key || '');
    if (openrouter_model !== undefined) await setSetting('openrouter_model', openrouter_model || '');

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/token-usage/summary
router.get('/token-usage/summary', async (req, res) => {
  try {
    const summary = await getTokenSummary();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/token-usage?from=&to=&group_by=&limit=
router.get('/token-usage', async (req, res) => {
  try {
    const { from, to, group_by, limit } = req.query;
    const data = await getTokenUsage({
      from: from || null,
      to: to || null,
      groupBy: group_by || null,
      limit: limit ? Number(limit) : null,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
