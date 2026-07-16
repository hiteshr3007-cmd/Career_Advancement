# AI Career Growth & Talent Intelligence Platform — Project Documentation

_Last updated: 2026-07-17_

## 1. Overview

A full-stack platform connecting **candidates** (job seekers who build a profile, upload a resume, and get matched against role benchmarks) with **company staff** (recruiters, HR reviewers, employers) who browse the candidate pool and manage the benchmarks candidates are scored against. **Administrators** oversee user accounts and roles.

**Stack**
- **Backend:** FastAPI + SQLAlchemy 2.0 + Alembic, PostgreSQL (pgvector extension for embeddings), JWT auth
- **Frontend:** Next.js 16 (App Router, Turbopack) + React 19, Tailwind CSS 4, axios
- **Database:** Shared cloud Postgres (Neon, pgvector-enabled) so the whole team works against the same data

---

## 2. Roles & Permissions

| Role | Self-registers? | Can do |
|---|---|---|
| **Candidate** | Yes (public) | Manage their own profile/skills/education/experience/resumes, compute their own benchmark matches, generate their own career plan, browse benchmarks read-only (needed to show match details), **cannot** browse other candidates or manage benchmarks |
| **Recruiter / HR Reviewer / Employer** | No — admin-provisioned only | Browse the full candidate directory, view any candidate's matches/career plan, create/edit/deactivate benchmarks. Identical permissions to each other (three labels, one capability set) |
| **Administrator** | Granted automatically via an email allowlist (`ADMIN_EMAILS` env var) on register | Everything above, plus create/list users, change any user's role, activate/deactivate accounts |

Enforcement is **server-side and live**: every request re-checks the user's current role from the database (not from the JWT claim), so a role change made by an admin takes effect on the user's very next request — no waiting for token expiry.

---

## 3. Backend

### 3.1 Modules & endpoints (45 routes)

| Module | Endpoints | Notes |
|---|---|---|
| **Authentication** | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm` | Access token (30 min) returned in the JSON body; refresh token (7 days) set as an **httpOnly, secure-in-prod cookie** scoped to `/api/v1/auth` — never exposed to page JavaScript (XSS hardening) |
| **Admin (user management)** | `POST /admin/users`, `GET /admin/users`, `PATCH /admin/users/{id}/role`, `PATCH /admin/users/{id}/activate`, `PATCH /admin/users/{id}/deactivate` | Admin-only; an admin cannot deactivate or change the role of their own account (400) |
| **Candidate Management** | `GET/PUT /candidates/me`, `POST/DELETE /candidates/me/skills[/{id}]`, `POST/DELETE /candidates/me/education[/{id}]`, `POST/DELETE /candidates/me/experience[/{id}]`, `POST /candidates/me/experience/recalculate` | Own-profile only, candidate-only |
| **Candidate Directory** | `GET /candidates` (paginated search: industry, functional area, experience level, skill, min/max years), `GET /candidates/{id}` | Recruiter/HR/Employer/Admin only; returns name/email enriched from the account, not just the profile |
| **Resume Intelligence** | `POST /resumes/upload`, `GET /resumes`, `GET /resumes/{id}`, `GET /resumes/{id}/download`, `POST /resumes/{id}/reparse`, `DELETE /resumes/{id}` | Candidate-only. Upload runs parsing as a background task; status moves `pending → processing → completed/failed` |
| **Benchmark Repository** | `POST/GET/PUT/DELETE /benchmarks[/{id}]` | Read: candidates + staff + admin (candidates need this to show match details). Create/edit/deactivate: staff + admin only |
| **Matching Engine** | `POST/GET /matching/me[/compute]`, `POST/GET /matching/candidates/{id}[/compute]` | Weighted score: required skills 40%, preferred skills 15%, certifications 15%, experience fit 15%, semantic similarity (embeddings) 15% → **Match Score**; separate **Readiness Score** and structured **Gap Summary** |
| **Career Intelligence (Phase 3)** | `POST/GET /career/me[/generate]`, `GET /career/me/gap-report`, `GET /career/me/recommendations`, `GET /career/me/roadmap`, `POST/GET /career/candidates/{id}[/generate]` | Async background generation (like resume parsing). Produces a detailed gap report, learning/certification recommendations, and a phased (30/90/180-day, 12-month) roadmap. Uses a local, deterministic pipeline by default; optionally enriches with an LLM (Ollama/OpenAI-compatible) that **degrades gracefully** to the deterministic output if unreachable — never fails the request |

### 3.2 Data model

`users` → `candidate_profiles` (1:1) → `candidate_skills`, `candidate_education`, `candidate_experience` (1:many each)
`benchmarks` (admin/staff-managed) ↔ `candidate_benchmark_matches` (computed scores per candidate/benchmark pair)
`resumes` (versioned per candidate, one active at a time) · `career_plans` (one per candidate, regenerated in place) · `refresh_tokens` / `password_reset_tokens`

Migrations (chronological): `0001_initial_schema` → `0002_collapse_roles` → `0003_uncollapse_roles` (role model settled on the 5-role table above) → `0004_experience_years_override` → `0005_career_plans`.

### 3.3 Key business logic

- **`total_experience_years` auto-derivation:** computed from the sum of each experience entry's duration (ongoing/missing end-date runs through today) every time an entry is added, removed, or a resume is parsed — *unless* the candidate has manually typed a value, tracked via an `experience_years_manual_override` flag. `POST /candidates/me/experience/recalculate` clears the override and re-derives it.
- **Resume parsing:** local, zero-cost regex/keyword rules parser (no OpenAI dependency) — extracts name/email/phone/LinkedIn/GitHub, skills (against a ~150-term catalog), certifications, education, and experience entries including start/end dates (parsed from formats like "Jan 2020", "2018", "present").
- **Matching engine:** case-insensitive skill/certification matching; embeddings computed locally via scikit-learn's `HashingVectorizer` (no OpenAI account needed) for the semantic-similarity component.
- **Career plan generation:** computes benchmark matches first if none exist yet, then runs the deterministic gap-analysis → recommendations → roadmap pipeline, persisting all three sections as JSON on one row per candidate.

### 3.4 Security & reliability hardening applied

- Refresh tokens as httpOnly cookies (not readable by page scripts)
- Dependency CVEs patched: `fastapi` 0.115.0→0.115.14, `python-jose` 3.3.0→3.5.0, `python-multipart` 0.0.9→0.0.20 (pulls a patched `starlette`)
- `NullPool` auto-selected instead of a client-side connection pool when the database URL points at an external pooler (e.g. Neon's `-pooler` endpoint), avoiding double-pooling instability
- Graceful `503 + Retry-After` on DB pool exhaustion/timeouts instead of raw `500`s
- Query optimization: candidate search/detail/matching use `selectinload` (not `joinedload`) for one-to-many collections (skills/education/experience), avoiding row-count multiplication that was slowing the directory under load
- Background resume-parsing task made tolerant of the resume being deleted mid-flight (previously an unhandled `StaleDataError`)
- Full RBAC/SQL-injection/JWT-forgery test coverage — all probes pass

---

## 4. Frontend

### 4.1 Pages

| Route | Who sees it | Purpose |
|---|---|---|
| `/login`, `/register`, `/forgot-password` | Everyone (unauthenticated) | Auth flows |
| `/dashboard` | Everyone | **Role-specific**: candidates see their own profile/resume/match progress; staff/admin see live talent-pool stats and auto-generated insights (top industry, most common skill, coverage gaps) |
| `/profile` | Candidate | View/edit profile, skills, education, experience; shows total experience as "(calculated)" vs "(manually set)" |
| `/upload` ("My Resumes") | Candidate | Drag-and-drop upload; lists all versions with live parsing-status polling, download, reparse, delete |
| `/matches` ("Career Matches") | Candidate | Compute and view benchmark match cards (score, readiness, skill gaps, experience gap) |
| `/candidates` | Recruiter/HR/Employer/Admin | Searchable/filterable candidate directory with a detail modal |
| `/benchmarks` | Recruiter/HR/Employer/Admin **only** (candidates blocked, see §5) | Create/edit/deactivate benchmark definitions |
| `/admin` | Administrator | Create staff accounts, change roles, activate/deactivate any user |
| `/settings` | Everyone | Placeholder |

### 4.2 Cross-cutting features

- **Auth:** access token kept client-side (memory/localStorage) for the `Authorization` header; refresh token lives only in the httpOnly cookie the browser sends automatically — axios configured with `withCredentials: true`. A response interceptor auto-refreshes on `401` and retries the original request once.
- **Notifications:** a bell icon with a live badge count, computed client-side from existing data (profile completeness, resume parsing status, match readiness for candidates; active-benchmark and talent-pool counts for staff) — no dedicated backend endpoint. Refreshes automatically whenever a mutation happens anywhere in the app (event-based, not polling).
- **Global skill search:** the topbar search (staff/admin only) jumps straight to the candidate directory pre-filtered by skill.
- **Role-gated navigation:** the sidebar renders only the links relevant to the signed-in user's role; every page also independently re-checks the role and shows an "Access restricted" state if reached directly by URL, so hiding a nav link is never the only line of defense.

### 4.3 Known gaps / not yet built

- Password reset has no email-delivery mechanism yet — the reset token isn't sent anywhere, so the flow can't be completed end-to-end in its current form.
- Gap Analysis / Career Roadmap have dedicated backend endpoints (`/career/*`) but no dedicated frontend pages yet — currently only reachable via the API.
- Settings page is a placeholder.

---

## 5. Recent change — Benchmark visibility restricted for candidates

Candidates previously had a full "Benchmarks" nav item/page (read-only browsing of the whole repository). This has been **removed for candidates** — only Recruiter/HR Reviewer/Employer/Administrator now see it (sidebar link hidden + page itself blocks direct navigation with an "Access restricted" message). The underlying backend read permission for candidates was deliberately **kept in place**, because the candidate-facing Career Matches page depends on it to show real benchmark names/categories on match cards — removing it entirely would have silently broken that feature.
