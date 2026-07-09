# AI Career Growth & Talent Intelligence Platform — Backend

FastAPI backend covering **Phase 1** (Auth, Candidate Portal, Resume Upload, Resume Parser)
and **Phase 2** (Candidate Profile Engine, Benchmark Repository, Matching Engine).

## Stack

- FastAPI + SQLAlchemy 2.0 + Alembic
- PostgreSQL + pgvector (embeddings for semantic matching, and resume file storage — see below)
- JWT auth (access + refresh tokens)
- OpenAI API (LLM resume-parsing fallback, embeddings)

Resume files are stored as blobs in Postgres (`stored_files` table) instead of
S3 for now, since no AWS account is set up yet. The `S3StorageService` code is
kept commented out in [app/services/storage.py](app/services/storage.py) — to
switch back later, uncomment it, point `storage_service` at an instance of it,
and fill in the AWS env vars.

## Local setup

1. Copy environment file and fill in secrets (OpenAI key is optional for
   local dev — the app degrades gracefully without it):

   ```
   cp .env.example .env
   ```

2. Start Postgres (pgvector-enabled) via Docker:

   ```
   docker compose up -d db
   ```

   The container maps to host port **5433** (5432 is commonly taken locally).

3. Create a virtualenv and install dependencies:

   ```
   python -m venv .venv
   .venv\Scripts\pip install -r requirements.txt
   ```

4. Run migrations:

   ```
   .venv\Scripts\python -m alembic upgrade head
   ```

5. Run the API:

   ```
   .venv\Scripts\python -m uvicorn app.main:app --reload
   ```

   Docs at `http://localhost:8000/docs`.

Alternatively, `docker compose up --build` runs both the API and DB in containers.

## Project layout

```
app/
  main.py              FastAPI app + router registration
  config.py            Settings (env-driven)
  database.py          SQLAlchemy session/engine
  core/
    security.py        Password hashing, JWT issuing/decoding
    deps.py             get_current_user, require_roles (RBAC)
  models/               SQLAlchemy ORM models (one file per domain)
  schemas/              Pydantic request/response schemas
  api/v1/                Route modules, one per platform module
  services/
    storage.py           Resume file storage (Postgres blob for now; S3 impl kept commented)
    resume_parsing/       extractor -> rules_parser -> llm_parser -> parser (orchestrator)
    matching/              embeddings + scoring engine
alembic/                 Migrations
```

## Modules implemented

| Module | Phase | Notes |
|---|---|---|
| 1. Authentication & Access Management | 1 | Register/login/refresh/logout, password reset, RBAC via `require_roles` |
| 2. Candidate Management System | 1 | Profile CRUD, skills/education/experience, resume upload + versioning |
| 3. Resume Intelligence Engine | 1 | Text extraction (pdf/docx, best-effort doc) → regex/keyword rules parser → LLM fallback when confidence is low → merged structured profile |
| 4. Candidate Profile Database | 2 | Search/filter candidates by industry, functional area, experience, skill |
| 5. Benchmark Repository | 2 | Admin-managed benchmarks per industry/level with required/preferred skills & certs |
| 6. Benchmark Matching Engine | 2 | Weighted score (required/preferred skills, certs, experience fit, embedding cosine similarity) → Match Score, Readiness Score, Gap Summary |

## Resume parsing strategy

`services/resume_parsing/parser.py` runs the fast regex/keyword-based parser first
(`rules_parser.py`). If its confidence score is below `0.7` (missing name/email,
too few skills, no experience or education section found), it falls back to an
OpenAI structured-output extraction (`llm_parser.py`) and merges the two results,
preferring LLM output only where the rules pass found nothing. If no `OPENAI_API_KEY`
is configured, or the LLM call fails, the rules-only result is used — parsing never
hard-fails because of missing AI credentials.

## Matching engine

`services/matching/engine.py` scores a candidate against a benchmark:

- Required skills match (40%), preferred skills (15%), certifications (15%),
  experience fit (15%), semantic similarity via pgvector cosine distance (15%)
  → **Match Score**
- Required skills + certifications + experience fit → **Readiness Score**
- Missing required/preferred skills, missing certs, experience shortfall →
  **Gap Summary**

Embeddings are computed lazily (on first match compute / benchmark create) and
cached on the row; matching still works with rule-based scores alone if
`OPENAI_API_KEY` is absent (semantic similarity term is simply 0).

## What's next (Phase 3+)

Gap Analysis Engine, Recommendation Engine, and Career Roadmap Generator (Phase 3)
will build on `CandidateBenchmarkMatch.gap_summary` and are expected to use
LangChain for multi-step reasoning over learning/certification recommendations —
not needed yet since Phases 1–2 only require single-shot extraction and scoring.
