# AI Career Growth & Talent Intelligence Platform — Backend

FastAPI backend covering **Phase 1** (Auth, Candidate Portal, Resume Upload, Resume Parser)
and **Phase 2** (Candidate Profile Engine, Benchmark Repository, Matching Engine).

## Stack

- FastAPI + SQLAlchemy 2.0 + Alembic
- PostgreSQL + pgvector (embeddings for semantic matching, and resume file storage — see below)
- JWT auth (access + refresh tokens)
- Local/free resume parsing + embeddings (no OpenAI account needed — see below)

Resume files are stored as blobs in Postgres (`stored_files` table) instead of
S3 for now, since no AWS account is set up yet. The `S3StorageService` code is
kept commented out in [app/services/storage.py](app/services/storage.py) — to
switch back later, uncomment it, point `storage_service` at an instance of it,
and fill in the AWS env vars.

Similarly, the OpenAI-based resume-parsing fallback and embeddings are
disabled — no OpenAI account/credits required to run this. See "Resume
parsing strategy" and "Matching engine" below for the local replacements and
how to switch back to OpenAI later.

## Local setup

1. Copy environment file:

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

`services/resume_parsing/parser.py` runs the fast regex/keyword-based parser
(`rules_parser.py`) — extracts name/email/phone, skills, certifications,
education, and experience from resume text with a confidence score. The LLM
fallback (`llm_parser.py`) that used to catch low-confidence extractions via
OpenAI is **disabled** (`parse_resume_with_llm` always raises
`LLMParserUnavailable`, which `parser.py` already catches and falls back to
the rules-only result) — zero cost, zero latency, no account needed. The full
OpenAI implementation is kept commented out in that file for later
re-enabling.

## Matching engine

`services/matching/engine.py` scores a candidate against a benchmark:

- Required skills match (40%), preferred skills (15%), certifications (15%),
  experience fit (15%), semantic similarity via pgvector cosine distance (15%)
  → **Match Score**
- Required skills + certifications + experience fit → **Readiness Score**
- Missing required/preferred skills, missing certs, experience shortfall →
  **Gap Summary**

Embeddings (`services/matching/embeddings.py`) are computed locally via
scikit-learn's `HashingVectorizer` (word/bigram feature hashing, 384
dimensions, no model download, no network call, deterministic) instead of the
OpenAI embeddings API. It captures literal word/skill overlap well but won't
catch synonyms an LLM embedding would (e.g. "ML" vs "machine learning") — a
reasonable trade-off given required/preferred skill lists are already
matched by exact overlap and only account for 15% of the score. The OpenAI
implementation is kept commented out in that file; re-enabling it also means
bumping `EMBEDDING_DIM` back to `1536` in `app/models/candidate.py`,
`app/models/benchmark.py`, and the initial Alembic migration, then rerunning
migrations against a fresh (or re-embedded) database.

## What's next (Phase 3+)

Gap Analysis Engine, Recommendation Engine, and Career Roadmap Generator (Phase 3)
will build on `CandidateBenchmarkMatch.gap_summary`.
