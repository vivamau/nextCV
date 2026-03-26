jest.mock('axios');
jest.mock('../services/settingsService');

const axios = require('axios');
const { getSetting } = require('../services/settingsService');
const { generateEmbedding, EMBED_MODEL } = require('../services/embeddingService');

const MOCK_VECTOR = new Array(768).fill(0.1);

afterEach(() => jest.clearAllMocks());

describe('generateEmbedding', () => {
  beforeEach(() => {
    getSetting.mockResolvedValue('http://localhost:11434');
  });

  test('returns embedding array from Ollama', async () => {
    axios.post.mockResolvedValueOnce({ data: { embedding: MOCK_VECTOR } });
    const result = await generateEmbedding('test text');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(768);
  });

  test('calls correct Ollama endpoint with nomic-embed-text', async () => {
    axios.post.mockResolvedValueOnce({ data: { embedding: MOCK_VECTOR } });
    await generateEmbedding('test text');
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:11434/api/embeddings',
      expect.objectContaining({ model: EMBED_MODEL, prompt: 'test text' }),
      expect.any(Object)
    );
  });

  test('uses provided ollamaUrl over saved setting', async () => {
    axios.post.mockResolvedValueOnce({ data: { embedding: MOCK_VECTOR } });
    await generateEmbedding('text', 'http://custom:11434');
    expect(axios.post).toHaveBeenCalledWith(
      'http://custom:11434/api/embeddings',
      expect.any(Object),
      expect.any(Object)
    );
    expect(getSetting).not.toHaveBeenCalled();
  });

  test('strips URLs and collapses whitespace before embedding', async () => {
    axios.post.mockResolvedValueOnce({ data: { embedding: MOCK_VECTOR } });
    await generateEmbedding('Hello https://example.com world   extra  spaces');
    const call = axios.post.mock.calls[0];
    const prompt = JSON.parse(call[1] ? JSON.stringify(call[1]) : '{}').prompt || call[1].prompt;
    expect(prompt).not.toContain('https://');
    expect(prompt).toBe('Hello world extra spaces');
  });

  test('truncates to 3000 chars', async () => {
    axios.post.mockResolvedValueOnce({ data: { embedding: MOCK_VECTOR } });
    await generateEmbedding('a'.repeat(5000));
    const call = axios.post.mock.calls[0];
    expect(call[1].prompt.length).toBe(3000);
  });

  test('returns null if no embedding returned', async () => {
    axios.post.mockResolvedValueOnce({ data: {} });
    const result = await generateEmbedding('text');
    expect(result).toBeNull();
  });

  test('throws when Ollama is unreachable', async () => {
    axios.post.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(generateEmbedding('text')).rejects.toThrow('ECONNREFUSED');
  });
});
