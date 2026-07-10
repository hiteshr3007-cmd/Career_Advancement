# Backend QA Loop — Final Report

**Exit status:** ✅ **3 consecutive clean runs** (63 passed, 0 failed each)  
**Date:** 2026-07-10  
**API:** `http://127.0.0.1:8000` against Neon Postgres (`ancient-cake-09086966`)

---

## Iteration log

| Iteration | Bugs found | Bugs fixed | Consecutive clean | Notes |
|-----------|------------|------------|-------------------|-------|
| 1 | 2 | 0 | 0 | Admin self-register; matching 500 numpy.float32 |
| 2 | 0 | 2 | 1 | Both fixes verified |
| 3 | 2 | 0 | 0 | Concurrent register/me 500s under Neon double-pooling |
| post-fix-1 | 0 | 1 (NullPool) | 1 | 63 passed / 12:56 |
| post-fix-2 | 0 | 0 | 2 | 63 passed / 12:19 |
| post-fix-3 | 0 | 0 | **3** | 63 passed / 12:04 — **EXIT** |

---

## Bugs fixed (root cause)

### 1. Privilege escalation on register
- **Endpoint:** `POST /api/v1/auth/register`
- **Error:** Self-registration as `administrator` returned 201
- **Root cause:** `UserRegister.role` accepted any `UserRole` with no allowlist
- **Fix:** `PUBLIC_REGISTER_ROLES` validator in `app/schemas/auth.py` — blocks `administrator`
- **Admin for tests/ops:** provision via DB (see `admin_auth` fixture)

### 2. Matching compute 500
- **Endpoint:** `POST /api/v1/matching/me/compute`
- **Error:** `psycopg2.ProgrammingError: can't adapt type 'numpy.float32'`
- **Root cause:** sklearn/pgvector embeddings produced numpy scalars that leaked into `match_score` / related Float columns
- **Fix:** coerce to Python `float` in `engine.py` + explicit float list in `embeddings.py`

### 3. Concurrent load 500s
- **Endpoints:** `GET /auth/me`, `POST /auth/register` under 20–50 concurrency
- **Error:** `OperationalError: server closed the connection unexpectedly` (Neon)
- **Root cause:** Double pooling — Neon `-pooler` PgBouncer + SQLAlchemy `QueuePool`
- **Fix:** `NullPool` when URL contains `-pooler` (`app/database.py`); `OperationalError` → HTTP 503 (`app/main.py`)

---

## Discovery — endpoints covered

33 routes under `/api/v1` + `/health` (see `reports/DISCOVERED_ENDPOINTS.md`).

Suite covers per endpoint: valid input, missing/wrong-type (422), auth failures (401/403), injection-ish payloads, boundary upload size, status codes.

---

## Stress / rate limit findings

| Probe | Result |
|-------|--------|
| Concurrent `/health` 10 → 50 → 100 | 0% errors; p50 ~4–5ms; p95 rises to ~318ms at 100 |
| Concurrent authenticated `/auth/me` ×50 | 0% errors after NullPool fix |
| Concurrent register ×20 | ≥80% success after fix |
| Upload beyond 10MB | 400 as designed |
| Rate limit (200 rapid `/health`) | **No 429s — no rate limiting** |
| Sustained 5+ min | Marked `@pytest.mark.slow` — **not in clean loop** |

**Breaking point (pre-fix):** Neon connection failures under ~20–50 concurrent DB-backed requests with QueuePool+pooler.  
**Post-fix:** health 100-way concurrent OK; auth/register bursts stable on NullPool.

---

## Resume parser integrity

- **16 diverse resumes**, field-level accuracy logged in `reports/RESUME_PARSER_ACCURACY.json`
- Overall / email / name / skills / experience / education / certs: **100%** on this fixture set
- Consistency: 3 identical re-runs per resume — **no flakiness**
- Caveat: fixtures are well-structured sectioned text matching the rules parser; real messy PDFs will score lower (LLM path disabled)

---

## TestSprite MCP

- Bootstrapped backend on port 8000; generated plan + executed 10 cloud cases
- **5/10 passed**; failures are harness issues (hardcoded users, `filename` vs `original_file_name`), documented in `testsprite_tests/testsprite-mcp-test-report.md`
- Local suite remains source of truth for exit criteria

---

## What is NOT covered (manual review needed)

1. **5-minute sustained load** (`pytest -m slow`) — run before production cutover  
2. **Password-reset end-to-end with email delivery** — token never emailed; confirm needs DB read  
3. **`is_verified` enforcement** — flag exists but login ignores it (product decision?)  
4. **MIME sniffing / malware scanning** on resume upload — extension-only check  
5. **True PDF parsing quality** on scanned/image resumes — rules parser needs text layer  
6. **LLM / OpenAI embedding path** — disabled; synonym matching gaps  
7. **S3 storage path** — Postgres blob only  
8. **Multi-instance / horizontal scale** — single uvicorn worker tested  
9. **IPv6 Neon connectivity edge cases** under regional failover  
10. **Frontend ↔ backend contract** (`auth.service.ts` JSON login vs form-urlencoded)  
11. **Admin user provisioning UX** — no invite/admin-create-user API yet  
12. **GDPR/PII deletion** beyond resume delete  
13. **OpenAPI response field aliases** for third-party clients expecting `filename`  
14. **Rate limiting / WAF** — intentionally absent; add before public internet exposure  
15. **Alembic migration rollback** and zero-downtime deploy drills  

---

## How to re-run

```powershell
cd backend
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
# other terminal:
.\.venv\Scripts\python -m pytest tests -m "not slow" -q
.\.venv\Scripts\python -m pytest tests -m slow -q   # sustained load
```

Artifacts: `backend/reports/`, `backend/testsprite_tests/`
