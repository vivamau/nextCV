const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Ollama } = require('ollama');

const PROMPTS_DIR = path.join(__dirname, '../prompts');

function loadPrompt(filename, text) {
  const template = fs.readFileSync(path.join(PROMPTS_DIR, filename), 'utf8');
  return template.replace('{{text}}', text).replace('{resume_text}', text);
}

/**
 * Detects whether a model name refers to a cloud-hosted model.
 */
function isCloudModel(model) {
  return !!(model && model.includes('cloud'));
}

/**
 * Extract the first complete top-level JSON array from a string by counting
 * brackets (string-aware). Returns the substring or null.
 * Handles trailing text, markdown code fences, and multiple arrays.
 */
function findFirstJsonArray(text) {
  const start = text.indexOf('[');
  if (start === -1) return null;
  let depth = 0, inString = false, escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return text.substring(start, i + 1);
    }
  }
  return null;
}

/**
 * Parse an LLM response that should contain a JSON array. Tolerates:
 *   - markdown code fences
 *   - double-encoded JSON (string containing a JSON array)
 *   - trailing/leading prose
 *   - multiple arrays (takes the first complete one)
 */
function parseJsonArrayFromLlm(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('LLM returned unparseable response: empty');
  }

  const attempts = [];

  // 1. Try as-is
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'string') {
      const inner = JSON.parse(parsed);
      if (Array.isArray(inner)) return inner;
    }
    // Parsed but not an array — fall through to "non-array" error
    throw new Error('LLM did not return a JSON array');
  } catch (e) {
    if (e.message === 'LLM did not return a JSON array') throw e;
    attempts.push(e.message);
  }

  // 2. Find first complete top-level array via bracket balance
  const slice = findFirstJsonArray(raw);
  if (slice) {
    try {
      const parsed = JSON.parse(slice);
      if (Array.isArray(parsed)) return parsed;
      throw new Error('LLM did not return a JSON array');
    } catch (e) {
      if (e.message === 'LLM did not return a JSON array') throw e;
      attempts.push(e.message);
    }
  }

  throw new Error(`LLM returned unparseable response: ${raw.substring(0, 200)}`);
}

async function extractSkillsFromResume(resumeText, config) {
  if (!resumeText || !resumeText.trim()) throw new Error('Resume text is empty');

  const prompt = loadPrompt('candidate_skills.txt', resumeText);
  const { text: raw, promptTokens, completionTokens } = await callLLM(prompt, config);

  const skills = parseJsonArrayFromLlm(raw);

  // Return a clean list of strings plus token usage
  return {
    skills: skills
      .map(s => {
        if (typeof s === 'string') return s.trim();
        if (typeof s === 'object' && s !== null && s.skill) return String(s.skill).trim();
        return null;
      })
      .filter(s => s && s.length > 1),
    promptTokens,
    completionTokens,
  };
}

/**
 * Generic LLM call helper used by both TOR and Resume extraction.
 * Returns { text, promptTokens, completionTokens }.
 */
async function callLLM(prompt, { provider, ollamaUrl, model, apiKey }) {
  if (provider === 'openrouter') {
    return callOpenRouter(prompt, { model, apiKey });
  }
  return callOllama(prompt, { ollamaUrl, model, apiKey });
}

async function callOllama(prompt, { ollamaUrl, model, apiKey }) {
  let raw = '';
  let promptTokens = 0;
  let completionTokens = 0;

  if (isCloudModel(model)) {
    const headers = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    const client = new Ollama({ host: 'https://ollama.com', headers });
    const stream = await client.generate({ model, prompt, stream: true, options: { num_ctx: 8192, temperature: 0.1 } });
    for await (const chunk of stream) {
      raw += chunk.response || '';
      if (chunk.prompt_eval_count !== undefined) promptTokens = chunk.prompt_eval_count;
      if (chunk.eval_count !== undefined) completionTokens = chunk.eval_count;
    }
  } else {
    const baseUrl = ollamaUrl || 'http://localhost:11434';
    const response = await axios.post(`${baseUrl}/api/generate`, { model, prompt, stream: false }, { timeout: 120000, headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {} });
    raw = response.data?.response || '';
    promptTokens = response.data?.prompt_eval_count || 0;
    completionTokens = response.data?.eval_count || 0;
  }
  return { text: raw, promptTokens, completionTokens };
}

async function callOpenRouter(prompt, { model, apiKey }) {
  if (!apiKey) throw new Error('OpenRouter API key is required');
  if (!model) throw new Error('OpenRouter model is required');

  let response;
  try {
    response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      },
      {
        timeout: 120000,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.error?.message || err.response?.data?.error || err.message;
    if (status === 402) {
      throw new Error(`OpenRouter 402 (Payment Required) — model "${model}" needs credits. Add credits at openrouter.ai/credits or pick a free model (e.g. ending in ":free"). Detail: ${detail}`);
    }
    if (status === 401) {
      throw new Error(`OpenRouter 401 (Unauthorized) — check your API key. Detail: ${detail}`);
    }
    if (status === 429) {
      throw new Error(`OpenRouter 429 (Rate Limited) — slow down or upgrade plan. Detail: ${detail}`);
    }
    if (status) {
      throw new Error(`OpenRouter ${status}: ${detail}`);
    }
    throw err;
  }

  const raw = response.data?.choices?.[0]?.message?.content || '';
  const promptTokens = response.data?.usage?.prompt_tokens || 0;
  const completionTokens = response.data?.usage?.completion_tokens || 0;
  return { text: raw, promptTokens, completionTokens };
}

async function extractSkillsFromTor(torText, config) {
  if (!torText || !torText.trim()) throw new Error('TOR text is empty');

  const prompt = loadPrompt('tor_skills.txt', torText);
  const { text: raw, promptTokens, completionTokens } = await callLLM(prompt, config);

  const skills = parseJsonArrayFromLlm(raw);

  return {
    skills: skills
      .map(s => {
        if (typeof s === 'string' || typeof s === 'number') return { skill: String(s).trim(), weight: 3 };
        if (typeof s === 'object' && s !== null && s.skill) {
          return {
            skill: String(s.skill).trim(),
            weight: typeof s.weight === 'number' ? s.weight : 3
          };
        }
        return null;
      })
      .filter(s => s && s.skill),
    promptTokens,
    completionTokens,
  };
}

async function extractLinksFromResume(resumeText, config) {
  if (!resumeText || !resumeText.trim()) throw new Error('Resume text is empty');

  const prompt = loadPrompt('candidate_links.txt', resumeText);
  const { text: raw, promptTokens, completionTokens } = await callLLM(prompt, config);

  const links = parseJsonArrayFromLlm(raw);

  // Validate and normalize the links
  return {
    links: links
      .map(link => {
        if (typeof link !== 'object' || !link) return null;
        if (!link.platform || !link.url) return null;

        const validPlatforms = ['linkedin', 'github', 'gitlab', 'atlassian'];
        const platform = String(link.platform).toLowerCase().trim();
        if (!validPlatforms.includes(platform)) return null;

        return {
          platform,
          url: String(link.url).trim(),
          username: link.username ? String(link.username).trim() : null
        };
      })
      .filter(link => link && link.url && link.platform),
    promptTokens,
    completionTokens,
  };
}

/**
 * Build an LLM config object from a settings map (as returned by getAllSettings).
 * Centralises provider-specific field selection.
 */
function buildLlmConfig(settings) {
  const provider = settings.llm_provider;
  if (provider === 'openrouter') {
    return {
      provider: 'openrouter',
      model: settings.openrouter_model,
      apiKey: settings.openrouter_api_key || null,
    };
  }
  return {
    provider: 'ollama',
    ollamaUrl: settings.ollama_url || 'http://localhost:11434',
    model: settings.llm_model,
    apiKey: settings.ollama_api_key || null,
  };
}

/**
 * Returns the model name in use for the active provider — used for token logging.
 */
function getActiveModel(settings) {
  return settings.llm_provider === 'openrouter' ? settings.openrouter_model : settings.llm_model;
}

module.exports = {
  extractSkillsFromTor, extractSkillsFromResume, extractLinksFromResume,
  isCloudModel, buildLlmConfig, getActiveModel,
};
