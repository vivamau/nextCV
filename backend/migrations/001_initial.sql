CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_application TEXT,
  type TEXT,
  wfp_jobs_applied INTEGER,
  skills_match_score TEXT,
  nationality TEXT,
  gender TEXT,
  age INTEGER,
  language_skill TEXT,
  mau_vote TEXT,
  mau_comments TEXT,
  luke_vote TEXT,
  luke_comments TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
