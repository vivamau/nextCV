const { Ollama } = require('ollama');
const { getAllSettings } = require('../services/settingsService');

async function test() {
  const s = await getAllSettings();
  console.log('Using model:', s.llm_model);

  const headers = {};
  if (s.ollama_api_key) headers['Authorization'] = `Bearer ${s.ollama_api_key}`;

  const client = new Ollama({ host: 'https://ollama.com', headers });

  const prompt = `Extract required skills from this job description as a JSON array only.
Return ONLY: ["skill1","skill2","skill3"]
No explanation. No markdown.

JOB: Candidate needs Python, SQL, project management and communication skills.`;

  // Try streaming — collect chunks
  console.log('Testing stream:true...');
  try {
    let collected = '';
    const stream = await client.generate({ model: s.llm_model, prompt, stream: true });
    for await (const chunk of stream) {
      process.stdout.write(chunk.response || '');
      collected += chunk.response || '';
    }
    console.log('\nStream collected:', JSON.stringify(collected));
  } catch (e) {
    console.log('Stream error:', e.message);
  }

  process.exit(0);
}

test().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
