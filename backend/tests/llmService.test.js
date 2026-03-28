jest.mock('axios');
jest.mock('ollama');

const axios = require('axios');
const { Ollama } = require('ollama');
const { extractSkillsFromTor, isCloudModel } = require('../services/llmService');

const LOCAL_CONFIG  = { ollamaUrl: 'http://localhost:11434', model: 'qwen3.5:4b',  apiKey: null };
const CLOUD_CONFIG  = { ollamaUrl: 'http://localhost:11434', model: 'glm-5:cloud', apiKey: 'my-key' };
const TOR_TEXT = 'We need Python, SQL and strong communication skills.';

// Mock Ollama SDK instance — simulate async generator for stream:true
const mockGenerateStream = jest.fn();
Ollama.mockImplementation(() => ({ generate: mockGenerateStream }));

// Helper: make an async generator from chunks
async function* makeStream(chunks) {
  for (const c of chunks) yield c;
}

afterEach(() => jest.clearAllMocks());

// --- isCloudModel ---
describe('isCloudModel', () => {
  test('returns true for cloud model names', () => {
    expect(isCloudModel('glm-5:cloud')).toBe(true);
    expect(isCloudModel('gpt-oss:120b-cloud')).toBe(true);
  });
  test('returns false for local model names', () => {
    expect(isCloudModel('qwen3.5:4b')).toBe(false);
    expect(isCloudModel('llama3')).toBe(false);
  });
  test('returns false for null/undefined', () => {
    expect(isCloudModel(null)).toBe(false);
    expect(isCloudModel(undefined)).toBe(false);
  });
});

// --- local model path (axios) ---
describe('extractSkillsFromTor — local model', () => {
  test('returns parsed skills array with token counts', async () => {
    axios.post.mockResolvedValueOnce({
      data: { response: '["Python","SQL","Communication"]', prompt_eval_count: 150, eval_count: 42 },
    });
    const result = await extractSkillsFromTor(TOR_TEXT, LOCAL_CONFIG);
    expect(result.skills).toEqual([
      { skill: 'Python', weight: 3 },
      { skill: 'SQL', weight: 3 },
      { skill: 'Communication', weight: 3 }
    ]);
    expect(result.promptTokens).toBe(150);
    expect(result.completionTokens).toBe(42);
  });

  test('defaults token counts to 0 when not in response', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '["Python"]' } });
    const result = await extractSkillsFromTor(TOR_TEXT, LOCAL_CONFIG);
    expect(result.promptTokens).toBe(0);
    expect(result.completionTokens).toBe(0);
  });

  test('calls local Ollama endpoint', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '["Python"]' } });
    await extractSkillsFromTor(TOR_TEXT, LOCAL_CONFIG);
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({ model: 'qwen3.5:4b', stream: false }),
      expect.any(Object)
    );
  });

  test('passes Authorization header when apiKey provided', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '["Python"]' } });
    await extractSkillsFromTor(TOR_TEXT, { ...LOCAL_CONFIG, apiKey: 'secret' });
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String), expect.any(Object),
      expect.objectContaining({ headers: { Authorization: 'Bearer secret' } })
    );
  });

  test('sends empty headers when no apiKey', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '["Python"]' } });
    await extractSkillsFromTor(TOR_TEXT, LOCAL_CONFIG);
    const call = axios.post.mock.calls[0];
    expect(call[2].headers).toEqual({});
  });

  test('extracts JSON array embedded in extra text', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: 'Skills: ["Python","SQL"] done.' } });
    const result = await extractSkillsFromTor(TOR_TEXT, LOCAL_CONFIG);
    expect(result.skills.map(s => s.skill)).toContain('Python');
  });

  test('handles missing response field', async () => {
    axios.post.mockResolvedValueOnce({ data: {} });
    await expect(extractSkillsFromTor(TOR_TEXT, LOCAL_CONFIG)).rejects.toThrow();
  });

  test('throws on ECONNREFUSED', async () => {
    axios.post.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    await expect(extractSkillsFromTor(TOR_TEXT, LOCAL_CONFIG)).rejects.toThrow('ECONNREFUSED');
  });
});

// --- cloud model path (Ollama SDK streaming) ---
describe('extractSkillsFromTor — cloud model', () => {
  test('uses Ollama SDK stream, not axios', async () => {
    mockGenerateStream.mockReturnValueOnce(makeStream([
      { response: '["Leadership"' }, { response: ',"Python"]' },
    ]));
    await extractSkillsFromTor(TOR_TEXT, CLOUD_CONFIG);
    expect(mockGenerateStream).toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('instantiates Ollama with https://ollama.com host', async () => {
    mockGenerateStream.mockReturnValueOnce(makeStream([{ response: '["Python"]' }]));
    await extractSkillsFromTor(TOR_TEXT, CLOUD_CONFIG);
    expect(Ollama).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'https://ollama.com' })
    );
  });

  test('passes Authorization header to SDK', async () => {
    mockGenerateStream.mockReturnValueOnce(makeStream([{ response: '["Python"]' }]));
    await extractSkillsFromTor(TOR_TEXT, CLOUD_CONFIG);
    expect(Ollama).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { Authorization: 'Bearer my-key' } })
    );
  });

  test('collects streamed chunks into full response', async () => {
    mockGenerateStream.mockReturnValueOnce(makeStream([
      { response: '["Python"' }, { response: ',"SQL"' }, { response: ']' },
    ]));
    const result = await extractSkillsFromTor(TOR_TEXT, CLOUD_CONFIG);
    expect(result.skills.map(s => s.skill)).toContain('Python');
    expect(result.skills.map(s => s.skill)).toContain('SQL');
  });

  test('captures token counts from stream chunks', async () => {
    mockGenerateStream.mockReturnValueOnce(makeStream([
      { response: '["Python"]', prompt_eval_count: 200, eval_count: 50 },
    ]));
    const result = await extractSkillsFromTor(TOR_TEXT, CLOUD_CONFIG);
    expect(result.promptTokens).toBe(200);
    expect(result.completionTokens).toBe(50);
  });

  test('handles double-encoded JSON string from cloud model', async () => {
    mockGenerateStream.mockReturnValueOnce(makeStream([
      { response: '"[\\"Python\\",\\"SQL\\"]"' },
    ]));
    const result = await extractSkillsFromTor(TOR_TEXT, CLOUD_CONFIG);
    expect(result.skills.map(s => s.skill)).toContain('Python');
    expect(result.skills.map(s => s.skill)).toContain('SQL');
  });

  test('throws when cloud LLM returns unparseable response', async () => {
    mockGenerateStream.mockReturnValueOnce(makeStream([{ response: 'I cannot help.' }]));
    await expect(extractSkillsFromTor(TOR_TEXT, CLOUD_CONFIG)).rejects.toThrow('unparseable');
  });

  test('throws when cloud LLM stream errors', async () => {
    mockGenerateStream.mockRejectedValueOnce(new Error('Network Error'));
    await expect(extractSkillsFromTor(TOR_TEXT, CLOUD_CONFIG)).rejects.toThrow('Network Error');
  });
});

// --- shared guards ---
describe('extractSkillsFromTor — guards', () => {
  test('throws when TOR text is empty', async () => {
    await expect(extractSkillsFromTor('', LOCAL_CONFIG)).rejects.toThrow('TOR text is empty');
  });

  test('throws when TOR text is whitespace only', async () => {
    await expect(extractSkillsFromTor('   ', LOCAL_CONFIG)).rejects.toThrow('TOR text is empty');
  });

  test('throws when LLM returns non-array JSON', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '{"skills":["Python"]}' } });
    await expect(extractSkillsFromTor(TOR_TEXT, LOCAL_CONFIG)).rejects.toThrow('JSON array');
  });

  test('trims whitespace from skills', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '[" Python ", " SQL "]' } });
    const result = await extractSkillsFromTor(TOR_TEXT, LOCAL_CONFIG);
    expect(result.skills[0].skill).toBe('Python');
  });

  test('filters blank entries', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '["Python","","SQL"]' } });
    const result = await extractSkillsFromTor(TOR_TEXT, LOCAL_CONFIG);
    expect(result.skills).toHaveLength(2);
  });

  test('coerces non-string items to string', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '["Python",42]' } });
    const result = await extractSkillsFromTor(TOR_TEXT, LOCAL_CONFIG);
    expect(result.skills.map(s => s.skill)).toContain('42');
  });
});
