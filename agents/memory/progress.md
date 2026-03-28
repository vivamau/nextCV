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

- [x] Dark Mode <!-- id: 130 -->
  - [x] Fixed `useTheme.js` hook (toggle not working under React 18 StrictMode, wrong initial value) <!-- id: 131 -->
  - [x] Applied `dark:` Tailwind variants across all pages and components <!-- id: 132 -->
  - [x] Fixed `SkillBadge` in `CandidateTable` missing dark mode colors <!-- id: 133 -->

- [x] Token Usage UI <!-- id: 140 -->
  - [x] Migration 011: `token_usage` table <!-- id: 141 -->
  - [x] `tokenService.js`: `logTokenUsage`, `getTokenSummary`, `getTokenUsage` (GROUP BY provider+model) <!-- id: 142 -->
  - [x] Settings page: `TokenUsagePanel` with totals, by-provider+model, by-operation <!-- id: 143 -->
  - [x] Stats page: `TokenSection` with bar charts by model and operation <!-- id: 144 -->
  - [x] `useTokenUsage` hook in `useSettings.js` <!-- id: 145 -->

- [x] Swagger / OpenAPI <!-- id: 150 -->
  - [x] `backend/swagger.yaml`: OpenAPI 3.0.3, 27 paths for all routes <!-- id: 151 -->
  - [x] Swagger UI served at `GET /api/docs` via `swagger-ui-express` + `yamljs` <!-- id: 152 -->

- [x] Vacancy Detail — Export XLS <!-- id: 160 -->
  - [x] Installed `exceljs` (replaced `xlsx` due to High vulnerability) <!-- id: 161 -->
  - [x] Export button in `VacancyCandidateTable` — exports filtered+sorted candidates with all columns including `job_application` <!-- id: 162 -->

- [x] Vacancy Detail — Bulk Extract Skills <!-- id: 170 -->
  - [x] `onVisibleCandidates` callback prop in `VacancyCandidateTable` to bubble filtered list to parent <!-- id: 171 -->
  - [x] `has_ai_skills` field added to `vacancyService.getCandidatesForVacancy` response <!-- id: 172 -->
  - [x] Extract Skills button filters to candidates without AI skills, shows count <!-- id: 173 -->
  - [x] `ExtractSkillsModal` with cost/time warning, local LLM tip, progress bar <!-- id: 174 -->
  - [x] Sequential `POST /api/candidates/:id/extract-skills` loop with skip/fail tracking <!-- id: 175 -->

- [x] Per-Vacancy CV Import <!-- id: 190 -->
  - [x] `findOrCreateCandidate` in `dbService.js` — upsert by `job_application`, returns existing id if found <!-- id: 191 -->
  - [x] `cvImportService.js`: `parseExcelBuffer(buffer)` + `importCvsForVacancy(rows, vacancyId, db)` <!-- id: 192 -->
  - [x] `POST /api/vacancies/:id/import-cvs` — multer file upload, parses Excel, imports + links candidates <!-- id: 193 -->
  - [x] Frontend: `ImportCvsModal` with drag-and-drop, progress, success summary <!-- id: 194 -->
  - [x] "Import CVs" button in vacancy detail header wires up modal <!-- id: 195 -->
  - [x] 342 tests passing, 86.52% branch coverage <!-- id: 196 -->

- [x] Test suite fixes and coverage recovery <!-- id: 180 -->
  - [x] Fixed `insertSkills` call signature bug in dbService, vacancyService, candidateRoutes tests <!-- id: 181 -->
  - [x] Updated skills endpoint tests to expect `{skill, llmExtracted}` objects <!-- id: 182 -->
  - [x] Fixed `vectorService` test for `indexCandidate` text prefix format <!-- id: 183 -->
  - [x] Fixed `insertLinks` not finalizing statement on error (production bug) <!-- id: 184 -->
  - [x] Fixed `llmService.js` null-check bug (`typeof null === 'object'`) <!-- id: 185 -->
  - [x] Added tests for extract-skills/links routes, token-usage endpoints, `has_ai_skills`, `getTokenUsage` groupBy modes, `extractSkillsFromResume`, `extractLinksFromResume` <!-- id: 186 -->
  - [x] 320 tests passing, 87.25% branch coverage (above 85% threshold) <!-- id: 187 -->
