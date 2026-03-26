const axios = require('axios');
const { getSetting } = require('./settingsService');

const EMBED_MODEL = 'nomic-embed-text';

/**
 * Generates a text embedding using the local Ollama nomic-embed-text model.
 * Returns a float array, or null on failure.
 */
/**
 * Cleans text for embedding: strips URLs, collapses whitespace, truncates.
 */
function cleanForEmbedding(text, maxChars = 3000) {
  return text
    .replace(/https?:\/\/\S+/g, '')   // remove URLs
    .replace(/\s+/g, ' ')              // collapse whitespace
    .trim()
    .substring(0, maxChars);
}

async function generateEmbedding(text, ollamaUrl = null) {
  const url = ollamaUrl || await getSetting('ollama_url') || 'http://localhost:11434';
  const response = await axios.post(`${url}/api/embeddings`, {
    model: EMBED_MODEL,
    prompt: cleanForEmbedding(text),
  }, { timeout: 30000 });
  return response.data.embedding || null;
}

module.exports = { generateEmbedding, EMBED_MODEL };
