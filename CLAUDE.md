# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NextCV is a full-stack CV/resume management system with AI-powered skill extraction and candidate-vacancy matching. It uses local LLMs (Ollama) for skill extraction and vector embeddings (LanceDB) for similarity matching.

## Development Commands

### Backend (`backend/`)
```bash
npm start              # Start server on port 3001
npm test               # Run Jest tests (uses --runInBand --forceExit)
npm run test:coverage  # Tests with coverage (85% threshold for lines/functions/branches)
npm run import         # Import CVs from Excel via scripts/importCvs.js
```

### Frontend (`frontend/`)
```bash
npm run dev      # Vite dev server on port 5173 (proxies /api to backend)
npm run build    # Production build
```

### Running a single test
```bash
cd backend && npx jest --runInBand --forceExit -- tests/path/to/test.js
```

## Architecture

**Monorepo with two independent npm projects** — `backend/` and `frontend/` each have their own `package.json`, `node_modules`, and scripts.

### Backend (Express + SQLite + Ollama)

- **Entry**: `backend/index.js` — sets up Express, registers routes, runs DB migrations on startup
- **Routes** (`backend/routes/`): Four route files — `candidateRoutes`, `torRoutes`, `vacancyRoutes`, `settingsRoutes` — mounted under `/api/candidates`, `/api/tors`, `/api/vacancies`, `/api/settings`
- **Services** (`backend/services/`): Business logic layer
  - `dbService` — DB operations + schema migrations (reads SQL files from `backend/migrations/`)
  - `llmService` — Ollama integration for LLM calls
  - `embeddingService` — text embedding generation
  - `vectorService` — LanceDB vector storage and similarity search
  - `candidateService`, `torService`, `vacancyService`, `settingsService` — domain logic
  - `torSkillsService` — TOR skill extraction
- **Database**: SQLite3 with WAL mode, foreign keys enabled. Schema managed via numbered SQL migrations in `backend/migrations/`. DB path configurable via `DB_PATH` env var (defaults to `./data/cvs.sqlite`).
- **AI Prompts**: Stored as text files in `backend/prompts/` — `candidate_skills.txt`, `candidate_links.txt`, `tor_skills.txt`

### Frontend (React + Vite + Tailwind)

- **Entry**: `frontend/src/main.jsx` → `App.jsx`
- **Routing**: React Router v6 — routes defined in `App.jsx`
- **Pages** (`frontend/src/pages/`): `candidates`, `candidate-detail`, `tors`, `tor-detail`, `vacancies`, `vacancy-detail`, `stats`, `settings`
- **Styling**: Tailwind CSS with PostCSS
- **API calls**: Axios, base URL from `VITE_API_URL` env var (defaults to `http://localhost:3001`)
- **No global state management** — components use local state

### Frontend-Backend Communication

Vite dev server proxies `/api` requests to the backend (`vite.config.js`). CORS configured via `FRONTEND_URL` env var on the backend.

## Key Data Flow

1. **Candidate import**: Excel file → `scripts/importCvs.js` → SQLite tables
2. **Skill extraction**: Candidate resume text → LLM via Ollama → `candidate_skills` table (prompted from `prompts/candidate_skills.txt`)
3. **Vector matching**: Skills → embeddings via Ollama → LanceDB → cosine similarity for candidate-TOR/vacancy matching
4. **Candidate-Vacancy mapping**: `candidates_to_vacancies` table links candidates to vacancies with scoring

## Environment Variables

**Backend** (`backend/.env`): `PORT` (3001), `DB_PATH` (./data/cvs.sqlite), `FRONTEND_URL` (http://localhost:5173)

**Frontend** (`frontend/.env`): `VITE_API_URL` (http://localhost:3001)

## Testing

- Jest with supertest for backend API tests
- Tests run with `--runInBand` (serial execution, needed for SQLite)
- Coverage collected from `services/**/*.js` and `routes/**/*.js`
- 85% coverage threshold enforced on lines, functions, and branches

## Development Strategy

Full strategy lives in `agents/agents.md`. Key rules:

- **TDD (red/green)**: Write tests first, run them, then write the code. Coverage must stay at 85%+.
- **Before ending a task**: Run all tests. If anything fails, fix the code — not the tests.
- **File size**: Keep files under 1000 lines. Split React code into components, Node.js into smaller modules.
- **Reuse code** as much as possible.
- **Security**: Dependencies must have no High or Critical vulnerabilities. Run `npm audit` regularly.
- **Migrations**: All `CREATE TABLE` statements must use `IF NOT EXISTS`. Migrations are periodically squashed back into `001_initial.sql`.

### Testing (from agents.md)
- Unit tests required for **every new file and feature**. Mock external dependencies (DB, FS).
- Integration tests required for **API endpoints** using supertest (Route → Controller → DB).
- Run tests before committing.

### Frontend file structure
```
src/pages/<page_name>/
  index.jsx
  components/
  tests/
```

### Session Start Protocol
When continuing work, read `agents/memory/progress.md` and `agents/memory/lessons.md` for context.
