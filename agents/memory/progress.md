# Progress Log

- [x] Add skills field to Resumes (CVs) table <!-- id: 0 -->

- [x] Add Gemini Pro Support <!-- id: 5 -->

- [x] Track Token Usage <!-- id: 10 -->

- [x] Add Ollama Dynamic URL Support <!-- id: 20 -->

- [x] Integrate Ollama SDK for Cloud Models <!-- id: 40 -->

- [x] Fix GlobalJobs.org Scraper <!-- id: 50 -->

- [x] Add Token Consumption Pie Charts <!-- id: 60 -->
  - [x] Process `summary` array into distinct mapped aggregations  <!-- id: 61 -->
  - [x] Render distinct `<PieChart>` visually into `TokenUsage.tsx` <!-- id: 62 -->

- [x] CV Visualization System <!-- id: 70 -->
  - [x] Import cvs.xlsx (357 candidates) into SQLite via exceljs <!-- id: 71 -->
  - [x] REST API: list, detail, stats endpoints <!-- id: 72 -->
  - [x] React frontend: candidates list, filters, pagination, detail, stats <!-- id: 73 -->
  - [x] TDD: 41 tests, 88.88% branch / 100% line coverage <!-- id: 74 -->
  - [x] New Excel structure (2-row header), resume_text (col 39) + skills (col 40) <!-- id: 75 -->
  - [x] Migrations 002: candidate_resumes + candidate_skills tables with FK <!-- id: 76 -->
  - [x] TDD: 58 tests, 85.71% branch / 100% line+func coverage <!-- id: 77 -->
  - [x] Detail page shows skills badges + full resume text <!-- id: 78 -->

- [x] TOR Management <!-- id: 80 -->
  - [x] Migration 003: tors table (name, description, va_link, file_name, file_content) <!-- id: 81 -->
  - [x] torService: CRUD with full TDD (19 tests) <!-- id: 82 -->
  - [x] torRoutes: POST/GET/PUT/DELETE with file upload via multer <!-- id: 83 -->
  - [x] Frontend: TORs page with card grid, create/edit modal, file upload, document viewer <!-- id: 84 -->
  - [x] 94 total tests, 89.28% branch coverage <!-- id: 85 -->

- [x] Vacancies <!-- id: 100 -->
  - [x] Migration 007: vacancies + candidates_to_vacancies tables <!-- id: 101 -->
  - [x] vacancyService: full CRUD + many-to-many helpers (27 tests) <!-- id: 102 -->
  - [x] vacancyRoutes: REST API with candidate linking endpoints <!-- id: 103 -->
  - [x] Frontend: Vacancies page with card grid, create/edit modal, TOR selector, date fields <!-- id: 104 -->
  - [x] 209 total tests, 91.43% branch coverage <!-- id: 105 -->

- [x] Vector Database (LanceDB) <!-- id: 110 -->
  - [x] vectorDb.js config — LanceDB connection to data/lancedb/ <!-- id: 111 -->
  - [x] embeddingService.js — nomic-embed-text via Ollama /api/embeddings <!-- id: 112 -->
  - [x] vectorService.js — indexCandidate, indexTor, rankCandidatesByTor <!-- id: 113 -->
  - [x] TOR upload auto-indexes into LanceDB <!-- id: 114 -->
  - [x] GET /api/vacancies/:id/rank — semantic similarity ranking endpoint <!-- id: 115 -->
  - [x] Vacancy detail shows % match badge alongside skill count <!-- id: 116 -->
  - [x] 232 total tests <!-- id: 117 -->

- [x] LLM Settings <!-- id: 90 -->
  - [x] Migration 004: settings table (key/value) with defaults <!-- id: 91 -->
  - [x] settingsService: getSetting, setSetting, getAllSettings (11 tests) <!-- id: 92 -->
  - [x] settingsRoutes: GET/PUT /api/settings + GET /api/settings/ollama/models proxy <!-- id: 93 -->
  - [x] Frontend: Settings page — provider dropdown, Ollama URL + model picker with refresh <!-- id: 94 -->
  - [x] 115 total tests, 89.75% branch coverage <!-- id: 95 -->

- [x] Finalize Candidate Indexing <!-- id: 120 -->
  - [x] TDD: Wrote failing tests for `index-all` and `:id/index` endpoints in `candidateRoutes.test.js` <!-- id: 121 -->
  - [x] Added `getAllCandidatesForIndexing` in `dbService` and implemented API endpoints <!-- id: 122 -->
  - [x] Added "Index Candidates" UI button to `CandidatesPage` <!-- id: 123 -->

- [x] Implement Semantic Candidate Ranking (Vacancy Match Scores) <!-- id: 124 -->
  - [x] TDD: tests for global vector searches and `/rank-candidates` endpoint in `vacancyRoutes.test.js` <!-- id: 125 -->
  - [x] Backend: updated `vectorService.rankCandidatesByTor` and added `GET /api/vacancies/:id/rank-candidates` <!-- id: 126 -->
  - [x] Frontend: Created `useSuggestedCandidates` hook and integrated match `%` UI into `AddCandidateModal` <!-- id: 127 -->
