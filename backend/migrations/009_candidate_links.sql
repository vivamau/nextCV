CREATE TABLE IF NOT EXISTS candidate_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  username TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(candidate_id, platform),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cl_candidate ON candidate_links(candidate_id);
CREATE INDEX IF NOT EXISTS idx_cl_platform ON candidate_links(platform);
