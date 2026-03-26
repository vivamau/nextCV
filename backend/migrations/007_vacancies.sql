CREATE TABLE IF NOT EXISTS vacancies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  tor_id INTEGER,
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tor_id) REFERENCES tors(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS candidates_to_vacancies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL,
  vacancy_id INTEGER NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(candidate_id, vacancy_id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (vacancy_id) REFERENCES vacancies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ctv_vacancy ON candidates_to_vacancies(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_ctv_candidate ON candidates_to_vacancies(candidate_id);
