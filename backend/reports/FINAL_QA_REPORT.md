# Backend QA Loop — Final Report

**Exit status:** ✅ **3 consecutive clean runs** (63 passed, 0 failed each)  
**Date:** 2026-07-10  
**Target DB for production/dev:** local Docker Postgres (`career_platform_db` on port 5433)

---

## Iteration log

| Iteration | Bugs found | Bugs fixed | Consecutive clean | Notes |
|-----------|------------|------------|-------------------|-------|
| 1 | 2 | 0 | 0 | Admin self-register; matching 500 numpy.float32 |
| 2 | 0 | 2 | 1 | Both product fixes verified |
| 3+ | — | — | 3 | Clean runs after fixes 1–2 |

---

## Bugs fixed (root cause)

### 1. Privilege escalation on register
- **Endpoint:** `POST /api/v1/auth/register`
- **Error:** Self-registration as `administrator` returned 201
- **Root cause:** `UserRegister.role` accepted any `UserRole` with no allowlist
- **Fix:** `PUBLIC_REGISTER_ROLES` validator in `app/schemas/auth.py` — blocks `administrator`
- **Admin for tests/ops:** provision via DB

### 2. Matching compute 500
- **Endpoint:** `POST /api/v1/matching/me/compute`
- **Error:** `psycopg2.ProgrammingError: can't adapt type 'numpy.float32'`
- **Root cause:** sklearn/pgvector embeddings produced numpy scalars that leaked into `match_score` / related Float columns
- **Fix:** coerce to Python `float` in `engine.py` + explicit float list in `embeddings.py`

### 3. Concurrent-load / NullPool — ⚠️ NOT APPLICABLE here
- Observed only when the API was temporarily pointed at a **Neon `-pooler`** URL (PgBouncer in front of SQLAlchemy `QueuePool`).
- **This codebase runs against plain local Docker Postgres** (`create_engine` + default `QueuePool`). There is no PgBouncer/pooler in front, so that double-pooling failure mode does not apply.
- **No `NullPool` branching and no `OperationalError` → 503 handler** are included in this change set.
- **When it becomes relevant:** if `DATABASE_URL` ever points at Neon `-pooler`, PgBouncer, or Supabase pooled URLs, detect the pooler and use `NullPool` (pooler already reuses connections).

---

## Discovery — endpoints covered

33 routes under `/api/v1` + `/health` (see `reports/DISCOVERED_ENDPOINTS.md`).

---

## Stress / rate limit findings

| Probe | Result |
|-------|--------|
| Concurrent `/health` 10 → 50 → 100 | 0% errors; p50 ~4–5ms; p95 rises to ~318ms at 100 |
| Upload beyond 10MB | 400 as designed |
| Rate limit (200 rapid `/health`) | **No 429s — no rate limiting** |
| Sustained 5+ min | Marked `@pytest.mark.slow` — **not in clean loop** |

---

## Resume parser integrity

- **16 diverse resumes**, field-level accuracy in `reports/RESUME_PARSER_ACCURACY.json`
- Overall / email / name / skills / experience / education / certs: **100%** on this fixture set
- Consistency: 3 identical re-runs per resume — **no flakiness**
- Caveat: fixtures are well-structured sectioned text; real messy PDFs will score lower (LLM path disabled)

---

## What is NOT covered (manual review needed)

1. **5-minute sustained load** (`pytest -m slow`)
2. **Password-reset end-to-end with email delivery**
3. **`is_verified` enforcement** on login
4. **MIME sniffing / malware scanning** on resume upload
5. **Scanned/image PDF parsing** quality
6. **LLM / OpenAI embedding path** (disabled)
7. **S3 storage path** (Postgres blobs today)
8. **Rate limiting / WAF** before public exposure
9. **Frontend ↔ backend login contract** (JSON vs form-urlencoded)
10. **Pooler/`NullPool` only if migrating off local Docker to a pooled cloud URL**

---

## How to re-run

```powershell
cd backend
docker compose up -d db
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Artifacts: `backend/reports/`
