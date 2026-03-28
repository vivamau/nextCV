# NextCV

A full-stack CV/resume management system with AI-powered skill extraction and candidate-vacancy matching. Uses local LLMs via [Ollama](https://ollama.com) for skill extraction and [LanceDB](https://lancedb.com) for semantic similarity matching.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Database](#database)
- [Project Structure](#project-structure)

---

## Overview

NextCV helps HR teams manage a pool of candidates against open vacancies. Key capabilities:

- **Candidate management** — import CVs from Excel, store resumes, track nationality, age, language skills, voting outcomes
- **AI skill extraction** — extract skills from resume text using a local LLM (Ollama) and store them per candidate
- **Terms of Reference (TOR)** — upload TOR documents, extract required skills with weighted importance
- **Vacancy management** — create vacancies linked to TORs, add/remove candidates, import CVs directly per vacancy
- **Semantic ranking** — rank candidates against a vacancy's TOR using vector embeddings (cosine similarity via LanceDB)
- **Token usage tracking** — monitor LLM API consumption by provider, model, and operation
- **Dark mode** — full dark/light theme support
- **API documentation** — OpenAPI 3.0 spec served at `/api/docs`

---

## Architecture

```
nextCV/
├── backend/        # Node.js / Express / SQLite / Ollama
└── frontend/       # React 18 / Vite / Tailwind CSS
```

Both are independent npm projects with their own `package.json`. The Vite dev server proxies all `/api` requests to the backend.

**Key data flows:**

1. **Import** — Excel file → `cvImportService` → `candidates` + `candidate_resumes` tables
2. **Skill extraction** — Resume text → Ollama LLM → `candidate_skills` table
3. **TOR indexing** — TOR document → Ollama embeddings → LanceDB table
4. **Candidate ranking** — Candidate embeddings ↔ TOR embedding → cosine similarity score

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20.x | Backend & frontend runtime |
| npm | 10.x | Package manager |
| [Ollama](https://ollama.com) | latest | Local LLM inference |

**Recommended Ollama models:**

```bash
ollama pull qwen2.5:7b          # skill extraction
ollama pull nomic-embed-text    # vector embeddings (required for ranking)
```

---

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd nextCV

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

See [Configuration](#configuration) for available variables.

### 3. Start the backend

```bash
cd backend
npm start
# → Server running on http://localhost:3001
# → Migrations run automatically on startup
```

### 4. Start the frontend

```bash
cd frontend
npm run dev
# → Dev server running on http://localhost:5173
```

### 5. Configure LLM

Open **Settings** (`/settings`) in the browser and select your Ollama model and URL. The default URL is `http://localhost:11434`.

---

## Configuration

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP port |
| `DB_PATH` | `./data/cvs.sqlite` | SQLite database file path |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3001` | Backend API base URL |

### In-app settings (stored in DB)

Configured via the Settings page or `PUT /api/settings`:

| Key | Description |
|-----|-------------|
| `llm_provider` | LLM provider (`ollama`) |
| `llm_model` | Model name (e.g. `qwen2.5:7b`) |
| `ollama_url` | Ollama endpoint URL |
| `ollama_api_key` | API key (if required) |

---

## Usage

### Import candidates

**Option A — per vacancy (recommended):**
Open a vacancy, click **Import CVs**, and upload an `.xlsx` file. Candidates are created (or matched by name) and linked to the vacancy automatically.

**Option B — batch script:**
```bash
cd backend
# Place your Excel file at data/cvs.xlsx, then:
npm run import
```

### Extract skills

1. Open a candidate's detail page and click **Extract Skills**, or
2. Open a vacancy and use **Extract Skills** to bulk-process all candidates in the vacancy who have not yet had AI extraction run.

### Rank candidates

Open a vacancy that has a TOR linked. The **Rank** tab shows candidates sorted by semantic similarity to the TOR. Candidates must be indexed first — use the **Index Candidates** button on the Candidates page.

### API documentation

Interactive Swagger UI is available at:

```
http://localhost:3001/api/docs
```

---

## API Reference

### Candidates — `/api/candidates`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List candidates (paginated, filterable, sortable) |
| `GET` | `/stats` | Aggregate statistics |
| `GET` | `/:id` | Get candidate by ID |
| `GET` | `/:id/resume` | Get resume text |
| `GET` | `/:id/skills` | Get skills list |
| `GET` | `/:id/links` | Get profile links (LinkedIn, GitHub, …) |
| `POST` | `/:id/extract-skills` | Extract skills from resume via LLM |
| `POST` | `/:id/extract-links` | Extract profile links from resume via LLM |
| `POST` | `/index-all` | Index all candidates in LanceDB |
| `POST` | `/:id/index` | Index a single candidate |

### TORs — `/api/tors`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all TORs |
| `GET` | `/:id` | Get TOR by ID |
| `GET` | `/:id/skills` | Get TOR skills |
| `POST` | `/` | Create TOR (multipart, optional file) |
| `PUT` | `/:id` | Update TOR |
| `DELETE` | `/:id` | Delete TOR |
| `POST` | `/:id/extract-skills` | Extract skills from TOR document via LLM |
| `PUT` | `/:id/skills` | Manually update TOR skills |
| `POST` | `/index-all` | Index all TORs in LanceDB |

### Vacancies — `/api/vacancies`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List vacancies |
| `GET` | `/:id` | Get vacancy by ID |
| `GET` | `/:id/candidates` | Candidates linked to vacancy (with skill match scores) |
| `GET` | `/:id/rank` | Rank linked candidates by TOR similarity |
| `GET` | `/:id/rank-candidates` | Rank all candidates (global) by TOR similarity |
| `POST` | `/` | Create vacancy |
| `PUT` | `/:id` | Update vacancy |
| `DELETE` | `/:id` | Delete vacancy |
| `POST` | `/:id/candidates/:candidateId` | Link a candidate to vacancy |
| `DELETE` | `/:id/candidates/:candidateId` | Unlink a candidate |
| `POST` | `/:id/candidates/add-all` | Link every candidate to vacancy |
| `POST` | `/:id/import-cvs` | Import candidates from Excel file (multipart) |

### Settings — `/api/settings`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Get all settings |
| `PUT` | `/` | Update settings |
| `GET` | `/ollama/models` | List available Ollama models |
| `GET` | `/token-usage/summary` | Token usage totals |
| `GET` | `/token-usage` | Token usage grouped by model or operation |

---

## Testing

Tests live in `backend/tests/` and use **Jest** with **supertest** for API integration tests.

```bash
cd backend

# Run all tests
npm test

# Run with coverage (85% threshold enforced)
npm run test:coverage

# Run a single test file
npx jest --runInBand --forceExit -- tests/vacancyRoutes.test.js
```

Tests run with `--runInBand` (serial execution, required for SQLite in-memory databases).

**Current coverage:** 342 tests, ~87% branch coverage.

---

## Database

SQLite with WAL mode and foreign keys enabled. The file is created at `DB_PATH` on first run. Migrations in `backend/migrations/` are applied automatically at startup.

| Migration | Tables |
|-----------|--------|
| `001_initial.sql` | `candidates` |
| `002_resume_skills.sql` | `candidate_resumes`, `candidate_skills` |
| `003_tors.sql` | `tors` |
| `004_settings.sql` | `settings` |
| `005_tor_skills.sql` | `tor_skills` |
| `006_ollama_api_key.sql` | adds `ollama_api_key` setting |
| `007_vacancies.sql` | `vacancies`, `candidates_to_vacancies` |
| `008_tor_skills_weight.sql` | adds `weight` column to `tor_skills` |
| `009_candidate_links.sql` | `candidate_links` |
| `010_llm_extracted_flag.sql` | adds `llm_extracted` flag to `candidate_skills` |
| `011_token_usage.sql` | `token_usage` |

The `data/` directory is git-ignored (except `data/.gitkeep`). Never commit database or Excel files.

---

## Project Structure

```
nextCV/
├── backend/
│   ├── index.js                  # Server entry point
│   ├── config/
│   │   └── db.js                 # SQLite connection
│   ├── migrations/               # Numbered SQL migration files
│   ├── prompts/                  # LLM prompt templates
│   │   ├── candidate_skills.txt
│   │   ├── candidate_links.txt
│   │   └── tor_skills.txt
│   ├── routes/                   # Express route handlers
│   ├── scripts/                  # One-off utility scripts
│   ├── services/                 # Business logic
│   ├── swagger.yaml              # OpenAPI 3.0 spec
│   └── tests/                   # Jest test suites
└── frontend/
    ├── public/
    └── src/
        ├── App.jsx               # Routes
        ├── hooks/                # Data-fetching hooks
        ├── layouts/
        └── pages/                # One folder per route
            ├── candidates/
            ├── candidate-detail/
            ├── tors/
            ├── tor-detail/
            ├── vacancies/
            ├── vacancy-detail/
            ├── stats/
            └── settings/
```
