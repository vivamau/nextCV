CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default: no provider selected
INSERT OR IGNORE INTO settings (key, value) VALUES ('llm_provider', 'none');
INSERT OR IGNORE INTO settings (key, value) VALUES ('llm_model', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ollama_url', 'http://localhost:11434');
