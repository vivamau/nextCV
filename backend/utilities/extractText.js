const mammoth = require('mammoth');

/**
 * Extracts plain text from an uploaded file buffer.
 * Supports: .docx (via mammoth), .txt, .pdf (raw text fallback).
 */
async function extractTextFromBuffer(buffer, filename) {
  const ext = (filename || '').toLowerCase().split('.').pop();

  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  // For .txt and unknown types, decode as UTF-8
  return buffer.toString('utf8');
}

module.exports = { extractTextFromBuffer };
