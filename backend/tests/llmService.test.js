jest.mock('axios');
jest.mock('ollama');

const axios = require('axios');
const { Ollama } = require('ollama');
const { extractSkillsFromTor, extractSkillsFromResume, extractLinksFromResume, isCloudModel } = require('../services/llmService');

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

  test('handles object skills with weight', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '[{"skill":"Python","weight":5},{"skill":"SQL","weight":2}]' } });
    const result = await extractSkillsFromTor(TOR_TEXT, LOCAL_CONFIG);
    const python = result.skills.find(s => s.skill === 'Python');
    expect(python.weight).toBe(5);
    const sql = result.skills.find(s => s.skill === 'SQL');
    expect(sql.weight).toBe(2);
  });

  test('defaults weight to 3 when object skill has no numeric weight', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '[{"skill":"Python"}]' } });
    const result = await extractSkillsFromTor(TOR_TEXT, LOCAL_CONFIG);
    expect(result.skills[0].weight).toBe(3);
  });

  test('filters null items from skills array', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '[{"skill":"Python"},null,{"noSkillKey":"x"}]' } });
    const result = await extractSkillsFromTor(TOR_TEXT, LOCAL_CONFIG);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].skill).toBe('Python');
  });
});

const RESUME_TEXT = 'Alice has 5 years of Python and SQL experience.';

// --- extractSkillsFromResume ---
describe('extractSkillsFromResume — local model', () => {
  test('returns skills array from JSON response', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '["Python","SQL"]', prompt_eval_count: 100, eval_count: 30 } });
    const result = await extractSkillsFromResume(RESUME_TEXT, LOCAL_CONFIG);
    expect(result.skills).toContain('Python');
    expect(result.skills).toContain('SQL');
    expect(result.promptTokens).toBe(100);
    expect(result.completionTokens).toBe(30);
  });

  test('throws when resume text is empty', async () => {
    await expect(extractSkillsFromResume('', LOCAL_CONFIG)).rejects.toThrow('Resume text is empty');
  });

  test('extracts JSON array embedded in extra text', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: 'Here are skills: ["Python","SQL"] end.' } });
    const result = await extractSkillsFromResume(RESUME_TEXT, LOCAL_CONFIG);
    expect(result.skills).toContain('Python');
  });

  test('throws when response is unparseable', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: 'I cannot help with that.' } });
    await expect(extractSkillsFromResume(RESUME_TEXT, LOCAL_CONFIG)).rejects.toThrow('unparseable');
  });

  test('throws when LLM returns non-array JSON', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '{"skills":["Python"]}' } });
    await expect(extractSkillsFromResume(RESUME_TEXT, LOCAL_CONFIG)).rejects.toThrow('JSON array');
  });

  test('handles skills as objects with skill key', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '[{"skill":"Python"},{"skill":"SQL"}]' } });
    const result = await extractSkillsFromResume(RESUME_TEXT, LOCAL_CONFIG);
    expect(result.skills).toContain('Python');
  });

  test('filters out null and short skills', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '["Python","","x",null]' } });
    const result = await extractSkillsFromResume(RESUME_TEXT, LOCAL_CONFIG);
    expect(result.skills).toEqual(['Python']);
  });

  test('handles double-encoded JSON string', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '"[\\"Python\\",\\"SQL\\"]"' } });
    const result = await extractSkillsFromResume(RESUME_TEXT, LOCAL_CONFIG);
    expect(result.skills).toContain('Python');
  });
});

describe('extractSkillsFromResume — cloud model', () => {
  test('uses Ollama SDK for cloud models', async () => {
    mockGenerateStream.mockReturnValueOnce(makeStream([{ response: '["Python","SQL"]' }]));
    const result = await extractSkillsFromResume(RESUME_TEXT, CLOUD_CONFIG);
    expect(mockGenerateStream).toHaveBeenCalled();
    expect(result.skills).toContain('Python');
  });
});

// --- extractLinksFromResume ---
describe('extractLinksFromResume', () => {
  const VALID_LINK = { platform: 'linkedin', url: 'https://linkedin.com/in/alice', username: 'alice' };

  test('throws when resume text is empty', async () => {
    await expect(extractLinksFromResume('', LOCAL_CONFIG)).rejects.toThrow('Resume text is empty');
  });

  test('returns valid links array', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: JSON.stringify([VALID_LINK]) } });
    const result = await extractLinksFromResume(RESUME_TEXT, LOCAL_CONFIG);
    expect(result.links).toHaveLength(1);
    expect(result.links[0].platform).toBe('linkedin');
    expect(result.links[0].url).toBe(VALID_LINK.url);
    expect(result.links[0].username).toBe('alice');
  });

  test('sets username to null when not provided', async () => {
    const link = { platform: 'github', url: 'https://github.com/alice' };
    axios.post.mockResolvedValueOnce({ data: { response: JSON.stringify([link]) } });
    const result = await extractLinksFromResume(RESUME_TEXT, LOCAL_CONFIG);
    expect(result.links[0].username).toBeNull();
  });

  test('filters out links with invalid platform', async () => {
    const link = { platform: 'twitter', url: 'https://twitter.com/alice' };
    axios.post.mockResolvedValueOnce({ data: { response: JSON.stringify([link]) } });
    const result = await extractLinksFromResume(RESUME_TEXT, LOCAL_CONFIG);
    expect(result.links).toHaveLength(0);
  });

  test('filters out links missing url or platform', async () => {
    const links = [{ platform: 'linkedin' }, { url: 'https://github.com' }, null, 'not-an-object'];
    axios.post.mockResolvedValueOnce({ data: { response: JSON.stringify(links) } });
    const result = await extractLinksFromResume(RESUME_TEXT, LOCAL_CONFIG);
    expect(result.links).toHaveLength(0);
  });

  test('throws when response is unparseable', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: 'no links here' } });
    await expect(extractLinksFromResume(RESUME_TEXT, LOCAL_CONFIG)).rejects.toThrow('unparseable');
  });

  test('throws when LLM returns non-array JSON', async () => {
    axios.post.mockResolvedValueOnce({ data: { response: '{"links":[]}' } });
    await expect(extractLinksFromResume(RESUME_TEXT, LOCAL_CONFIG)).rejects.toThrow('JSON array');
  });
});
