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

async function extractSkillsFromResume(resumeText, config) {
  if (!resumeText || !resumeText.trim()) throw new Error('Resume text is empty');

  const prompt = loadPrompt('candidate_skills.txt', resumeText);
  const { text: raw, promptTokens, completionTokens } = await callLLM(prompt, config);

  let skills;
  try {
    let parsed = JSON.parse(raw);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    skills = parsed;
  } catch (_e) {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error(`LLM returned unparseable response: ${raw.substring(0, 200)}`);
    skills = JSON.parse(match[0]);
  }

  if (!Array.isArray(skills)) throw new Error('LLM did not return a JSON array');

  // Return a clean list of strings plus token usage
  return {
    skills: skills
      .map(s => {
        if (typeof s === 'string') return s.trim();
        if (typeof s === 'object' && s.skill) return String(s.skill).trim();
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
async function callLLM(prompt, { ollamaUrl, model, apiKey }) {
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

async function extractSkillsFromTor(torText, config) {
  if (!torText || !torText.trim()) throw new Error('TOR text is empty');

  const prompt = loadPrompt('tor_skills.txt', torText);
  const { text: raw, promptTokens, completionTokens } = await callLLM(prompt, config);

  let skills;
  try {
    let parsed = JSON.parse(raw);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    skills = parsed;
  } catch (_e) {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error(`LLM returned unparseable response: ${raw.substring(0, 200)}`);
    skills = JSON.parse(match[0]);
  }

  if (!Array.isArray(skills)) throw new Error('LLM did not return a JSON array');

  return {
    skills: skills
      .map(s => {
        if (typeof s === 'string' || typeof s === 'number') return { skill: String(s).trim(), weight: 3 };
        if (typeof s === 'object' && s.skill) {
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

  let links;
  try {
    let parsed = JSON.parse(raw);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    links = parsed;
  } catch (_e) {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error(`LLM returned unparseable response: ${raw.substring(0, 200)}`);
    links = JSON.parse(match[0]);
  }

  if (!Array.isArray(links)) throw new Error('LLM did not return a JSON array');

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

module.exports = { extractSkillsFromTor, extractSkillsFromResume, extractLinksFromResume, isCloudModel };
