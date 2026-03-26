# Architectural Decisions


## Vector Database Integration
**Date:** 2026-03-26
**Context/Problem:** Current skill matching uses exact string comparison (`LOWER(TRIM)`), which misses semantically equivalent skills with different wording (e.g. "Project Management" vs "Managing Projects").
**Decision:** Add LanceDB (already used in findmyjob) as an embedded vector store. Use `nomic-embed-text:latest` (already available in local Ollama) to generate embeddings for candidate resumes and TOR documents. This enables:
- Semantic candidate ranking per vacancy (similarity score vs exact skill count)
- TOR-to-TOR similarity for reuse/comparison
- Resume-to-TOR full-text matching beyond keyword overlap
**Implementation plan:**
- Index candidate resumes and TOR file_content on import/upload
- Add a `vectorService.js` (pattern from findmyjob)
- Expose a `/api/vacancies/:id/rank-candidates` endpoint returning candidates sorted by semantic similarity score
- Display similarity % alongside the existing skill match count on the vacancy detail page
**Status:** Approved, pending implementation.
