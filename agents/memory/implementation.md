# Implementation Plan: Finalize Candidate Indexing

## Goal Description
The objective is to "finalize the indexing of candidates" using a TDD red/green approach. Candidate indexing is currently only available via a background script (`scripts/indexCandidates.js`) or during initial CV import. We will expose the indexing functionality via REST API endpoints and integrate it into the frontend UI, ensuring that users can trigger indexing directly from the UI.

## Proposed Changes

### Backend
1. **Tests (Red Phase)**: 
   - Add tests to `backend/tests/candidateRoutes.test.js` for `POST /api/candidates/index-all` and `POST /api/candidates/:id/index`.
   - Mock `vectorService.indexCandidate`.
2. **Implementation (Green Phase)**:
   - Add `POST /api/candidates/index-all` endpoint to `backend/routes/candidateRoutes.js`.
   - Add `POST /api/candidates/:id/index` endpoint to `backend/routes/candidateRoutes.js`.
3. **Verification**:
   - Ensure `npm test` passes for the new routes and `vectorService`.

### Frontend
1. **Candidates Page (`frontend/src/pages/candidates/index.jsx`)**:
   - Add an "Index All Candidates" button next to existing filters.
   - Wire it up to call the `index-all` endpoint and show a loading indicator.