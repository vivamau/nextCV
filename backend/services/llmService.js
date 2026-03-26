const axios = require('axios');
const { Ollama } = require('ollama');

const SKILLS_PROMPT = (text) => `You are an HR analyst. Extract a list of required skills from the following Terms of Reference document.
Return ONLY a valid JSON array of strings with no explanation, no markdown, no code fences — just the raw JSON array.
Example output: ["Project Management","Data Analysis","Communication"]

TOR TEXT:
${text}

JSON array of skills:`;

/**
 * Detects whether a model name refers to a cloud-hosted model.
 */
function isCloudModel(model) {
  return !!(model && model.includes('cloud'));
}

async function extractSkillsFromTor(torText, { ollamaUrl, model, apiKey }) {
  if (!torText || !torText.trim()) {
    throw new Error('TOR text is empty');
  }

  const prompt = SKILLS_PROMPT(torText);
  let raw = '';

  if (isCloudModel(model)) {
    // Cloud models via Ollama SDK pointing to https://ollama.com
    // stream:false hangs for cloud models — must use stream:true and collect chunks
    const headers = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const client = new Ollama({ host: 'https://ollama.com', headers });

    const stream = await client.generate({
      model, prompt, stream: true,
      options: { num_ctx: 8192, temperature: 0.1 },
    });

    for await (const chunk of stream) {
      raw += chunk.response || '';
    }
  } else {
    // Local models via axios to the local Ollama instance
    const baseUrl = ollamaUrl || 'http://localhost:11434';
    const headers = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await axios.post(
      `${baseUrl}/api/generate`,
      { model, prompt, stream: false },
      { timeout: 120000, headers }
    );
    raw = response.data?.response || '';
  }

  let skills;
  try {
    let parsed = JSON.parse(raw);
    // Some models return a JSON-encoded string wrapping the array — unwrap it
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    skills = parsed;
  } catch (_e) {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error(`LLM returned unparseable response: ${raw.substring(0, 200)}`);
    skills = JSON.parse(match[0]);
  }

  if (!Array.isArray(skills)) throw new Error('LLM did not return a JSON array');

  return skills
    .map(s => (typeof s === 'string' ? s.trim() : String(s).trim()))
    .filter(Boolean);
}

module.exports = { extractSkillsFromTor, isCloudModel };
