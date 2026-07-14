# AI Career Growth & Talent Intelligence Platform — Backend

FastAPI backend covering **Phase 1** (Auth, Candidate Portal, Resume Upload, Resume Parser)
and **Phase 2** (Candidate Profile Engine, Benchmark Repository, Matching Engine).

## Stack

- FastAPI + SQLAlchemy 2.0 + Alembic
- PostgreSQL + pgvector (embeddings for semantic matching, and resume file storage — see below).
  The team's shared database runs on **Neon** — see "Neon: our shared team database" below for
  how to connect to it; local Docker Postgres also works for solo/offline dev.
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

## Neon: our shared team database

**This project's team database runs on [Neon](https://neon.tech)** (serverless
Postgres, pgvector-enabled) instead of everyone running their own local
Postgres. Local Docker Postgres (below) still works and is useful for fully
offline/solo work, but for anything you want teammates to see, point at Neon.

### Getting access (one-time, per teammate)

1. **Ask whoever administers the Neon project for the connection string.**
   Get it via a secure channel (1Password, Slack DM, etc.) — **it must never
   be pasted into a public channel, committed to git, or added to
   `.env.example`.** `.env.example` only ever contains placeholders; your real
   `.env` (which is gitignored) holds the actual secret.
2. Open your local `backend/.env` (copy from `.env.example` first if you don't
   have one yet) and set **both** of these to the connection string you were
   given:
   ```
   DATABASE_URL=postgresql+psycopg2://<user>:<password>@<host>/<db>?sslmode=require
   DOCKER_DATABASE_URL=postgresql+psycopg2://<user>:<password>@<host>/<db>?sslmode=require
   ```
   `DATABASE_URL` is used when you run the API directly via `uvicorn`/venv;
   `DOCKER_DATABASE_URL` is used when you run it via `docker compose` (see
   `docker-compose.yml` — it overrides the local-`db`-container default).
3. **Do not run migrations yourself.** The schema is already set up on the
   shared database — running `alembic upgrade head` against Neon is a
   one-time, one-person action (see "Project database admin" below), not a
   per-teammate setup step.
4. Run the API as usual:
   - Via venv: `.venv\Scripts\python -m uvicorn app.main:app --reload`
   - Via Docker: `docker compose up --no-deps -d api` — the `--no-deps` flag
     is important here, it skips starting the local `db` container so it
     can't silently shadow the shared one.
5. Verify you're actually on the shared DB, not a stray local instance: log
   in or register a test user, then ask a teammate to confirm they can see it
   (e.g. via `GET /api/v1/admin/users` as an admin, or just by you both
   hitting the same `/health` — if in doubt, check that `DATABASE_URL` in
   your `.env` matches the shared string, not `localhost:5433`).

### Connection string: pooled vs. direct

Neon gives you two connection strings for the same database — check which
one you were given:

- **Direct** (host has no `-pooler` in it) — talks straight to Postgres.
  Fine for one or two people, but Neon's direct-connection limit is small and
  will be exhausted quickly once several teammates run the app at once.
- **Pooled** (host contains `-pooler`, e.g.
  `ep-xxxx-pooler.c-9.us-east-1.aws.neon.tech`) — routed through Neon's
  built-in PgBouncer, supports far more concurrent connections. **Use this
  one for day-to-day team development.** Grab it from the Neon dashboard
  (it's labeled "Pooled connection").

`app/database.py` automatically detects which kind you're using — it checks
for `-pooler` in `DATABASE_URL` and switches SQLAlchemy's connection pool
accordingly:

- **Pooled URL** → SQLAlchemy uses `NullPool` (no pooling on our side —
  correct, since Neon's PgBouncer already pools connections; stacking our
  own pool on top of theirs causes connection-lifecycle bugs).
- **Direct URL** → SQLAlchemy uses a tuned `QueuePool` (`DB_POOL_SIZE` /
  `DB_MAX_OVERFLOW` / `DB_POOL_TIMEOUT` in `.env`), same as for local Postgres.

You don't need to configure this yourself — just put the right connection
string in `.env` and it works correctly either way.

### Project database admin (whoever manages the Neon project)

- Enable pgvector once per Neon project (usually already done, but if
  starting a fresh project): `CREATE EXTENSION IF NOT EXISTS vector;` in the
  Neon SQL editor.
- Run migrations against the shared DB after pulling any new migration —
  this should be done by one person, not everyone independently:
  ```
  .venv\Scripts\python -m alembic upgrade head
  ```
  (or `docker compose exec api alembic upgrade head` if running via Docker)
- If the connection string is ever exposed (e.g. pasted somewhere it
  shouldn't have been), rotate it from the Neon dashboard: your project →
  **Settings → Reset password** — then redistribute the new string to the
  team through a secure channel and have everyone update their `.env`.
- Neon branching (a separate Postgres branch per PR/feature, cheap and
  instant) is available if the team wants isolated environments instead of
  one shared database — ask if you want this set up; it's not configured by
  default here.

### Running your own isolated local Postgres instead

If you want to work fully offline, or don't want your experiments visible to
the team, you can still use local Docker Postgres exactly as before — just
leave `DATABASE_URL`/`DOCKER_DATABASE_URL` unset (or pointed at
`localhost:5433`) and follow "Local setup" above. The two modes are mutually
exclusive per person: whichever connection string is in your `.env` is where
your requests go.

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
