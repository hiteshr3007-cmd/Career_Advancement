# Backend / Module Test Cases

Module-level engine coverage. **Modules 7–9 are LIVE and executable.** **Modules 10–17 are placeholders — templates only, do not execute.** See `README.md` for prefixes and the ship-a-module workflow.

Common setup for live Module 7–9 TCs:
- Candidate account (`/career/me*` routes) with skills + experience and ≥1 active benchmark whose `category` matches the candidate's `industry` (otherwise matching returns zero and the plan is empty — see the frontend FZ- fix).
- Company-staff/admin account for `/career/candidates/{id}*` routes.
- Base URL `/api/v1`. Auth: `Authorization: Bearer <access_token>`. Generation is async: `POST .../generate` → 202; poll `GET .../` until `status=completed`; section endpoints return 409 until completed and 404 if no plan exists.

---

# LIVE MODULES (execute)

## Module 7 — Gap Analysis Engine (prefix `GA-`)

### GA-001 — Generate and retrieve a gap report (happy path)
- **Preconditions:** Candidate with matching active benchmark.
- **Roles:** Candidate
- **Steps:** 1) `POST /career/me/generate` → expect 202. 2) Poll `GET /career/me` until `status=completed`. 3) `GET /career/me/gap-report`.
- **Expected:** 200 with a gap report containing `overall_readiness_score`, `overall_recommendation`, `target_benchmarks`, `skill_gaps` (each with a priority/priority_band), `missing_certifications`, an experience gap, resume-quality issues, and a narrative. Values are internally coherent (skills the candidate lacks vs. benchmark required/preferred).
- **Priority:** critical

### GA-002 — Skill-gap correctness against a known benchmark
- **Preconditions:** Candidate missing exactly one required and one preferred benchmark skill.
- **Roles:** Candidate
- **Steps:** 1) Generate plan. 2) Inspect `skill_gaps`.
- **Expected:** The missing required skill appears with higher priority than the missing preferred; skills the candidate already has do not appear as gaps.
- **Priority:** major

### GA-003 — Certification and experience gap present
- **Preconditions:** Benchmark requiring a certification the candidate lacks and `min_experience_years` above the candidate's total.
- **Roles:** Candidate
- **Steps:** 1) Generate. 2) Inspect `missing_certifications` and the experience gap.
- **Expected:** Missing certification listed; experience gap reflects `benchmark_min_years − candidate_years` (≥0); when candidate meets experience, gap is 0 and framed as met.
- **Priority:** major

### GA-004 — Async lifecycle: section before completion → 409
- **Preconditions:** A generation just started (still pending/processing) — best reached under the LLM path or immediately after POST.
- **Roles:** Candidate
- **Steps:** 1) `POST /career/me/generate`. 2) Immediately `GET /career/me/gap-report` before completion.
- **Expected:** 409 ("not ready") while `status != completed`. (Under sub-second deterministic generation this window is tiny; confirm via code path `_completed_section` if not reproducible live.)
- **Priority:** major

### GA-005 — RBAC: staff view any candidate's gap report; candidate blocked on staff route
- **Preconditions:** Completed plan for candidate C; staff account.
- **Roles:** Candidate, staff/admin
- **Steps:** 1) As staff, `GET /career/candidates/{C}` → 200. 2) As candidate, `GET /career/candidates/{C}` → 403. 3) As staff, `GET /career/me` → 403.
- **Expected:** Staff can read any candidate's plan; candidate token is 403 on `/career/candidates/*`; staff token is 403 on `/career/me*`.
- **Priority:** critical

### GA-006 — Negative: unknown candidate id on staff route → 404
- **Preconditions:** Staff account.
- **Roles:** Staff/admin
- **Steps:** 1) `GET /career/candidates/{random-uuid}`. 2) `POST /career/candidates/{random-uuid}/generate`.
- **Expected:** 404 (not 200 with empty body) for a nonexistent candidate id.
- **Priority:** major

---

## Module 8 — Career Recommendation Engine (prefix `CR-`)

### CR-001 — Retrieve recommendations (happy path)
- **Preconditions:** Completed plan for candidate with real gaps.
- **Roles:** Candidate
- **Steps:** 1) After completion, `GET /career/me/recommendations`.
- **Expected:** 200 with learning items, certification suggestions (each with provider/URL where available), resume improvements, and career-development advice. Non-empty for a candidate with gaps.
- **Priority:** critical

### CR-002 — Recommendations trace to the gap report
- **Preconditions:** Gap report + recommendations for the same candidate.
- **Roles:** Candidate
- **Steps:** 1) Note top skill/cert gaps from GA-001. 2) Inspect recommendations.
- **Expected:** Recommendations address the surfaced gaps (a missing skill drives a learning item; a missing cert drives a certification suggestion). Where a gap has no catalog entry, the plan `notes` explain the omission rather than silently dropping it.
- **Priority:** major

### CR-003 — Recommendation dedup (no duplicate items)
- **Preconditions:** Candidate whose gaps could map to overlapping catalog entries.
- **Roles:** Candidate
- **Steps:** 1) Generate. 2) Inspect learning items / certification suggestions for duplicates.
- **Expected:** No duplicate recommendation entries (dedup fix `714f5ca0`).
- **Priority:** major

### CR-004 — Async lifecycle: recommendations 409 before completion
- **Roles:** Candidate
- **Steps:** 1) `POST /career/me/generate`. 2) Immediately `GET /career/me/recommendations`.
- **Expected:** 409 until `status=completed`.
- **Priority:** minor

### CR-005 — RBAC on recommendations content via staff route
- **Preconditions:** Completed plan; staff account.
- **Roles:** Candidate, staff
- **Steps:** 1) Staff `GET /career/candidates/{C}` includes recommendations. 2) Candidate 403 on staff route.
- **Expected:** Recommendations present in the staff full-plan view; candidate blocked on staff routes.
- **Priority:** major

### CR-006 — Edge: LLM unavailable → deterministic recommendations, `llm_used=false`
- **Preconditions:** Ollama not running (or `PHASE3_LLM_ENABLED=false`).
- **Roles:** Candidate
- **Steps:** 1) Generate. 2) Inspect plan `llm_used` and `notes`; inspect recommendations.
- **Expected:** Plan completes with `llm_used=false`; deterministic recommendations returned; `notes` explain the LLM was skipped. Not a failure.
- **Priority:** minor

---

## Module 9 — Career Roadmap Generator (prefix `RM-`)

### RM-001 — Retrieve roadmap with all four horizons (happy path)
- **Preconditions:** Completed plan.
- **Roles:** Candidate
- **Steps:** 1) `GET /career/me/roadmap`.
- **Expected:** 200 with four phases — 30-day, 90-day, 180-day, 12-month — each with a goal and actions; a `generated_by` marker (`deterministic` or `llm:...`). Deterministic scaffold emits all four.
- **Priority:** critical

### RM-002 — Actions tagged by focus area
- **Preconditions:** Completed roadmap.
- **Roles:** Candidate
- **Steps:** 1) Inspect actions across phases.
- **Expected:** Actions carry a focus-area tag (skill / certification / resume / experience / networking); tags are valid values.
- **Priority:** major

### RM-003 — Roadmap consistent with gaps and recommendations
- **Preconditions:** All three sections for the same candidate.
- **Roles:** Candidate
- **Steps:** 1) Cross-check roadmap actions against gap report + recommendations.
- **Expected:** Early phases target the highest-priority gaps; roadmap does not reference skills the candidate already has as gaps to close.
- **Priority:** major

### RM-004 — LLM path may emit fewer than four phases (known limitation)
- **Preconditions:** LLM path enabled and reachable (Ollama up, small model e.g. qwen2.5:3b).
- **Roles:** Candidate
- **Steps:** 1) Generate with LLM enabled. 2) Count roadmap phases; check `generated_by`.
- **Expected:** `generated_by` = `llm:...`; a small model MAY return <4 phases — record the count; this is a documented quality limitation, not a crash. Deterministic path must still produce four.
- **Priority:** minor

### RM-005 — RBAC + regenerate via staff route
- **Preconditions:** Candidate plan; staff account.
- **Roles:** Candidate, staff
- **Steps:** 1) Staff `POST /career/candidates/{C}/generate` → 202 → poll to completed. 2) Candidate 403 on staff route; staff 403 on `/career/me/roadmap`.
- **Expected:** Staff regenerate completes; RBAC holds both directions.
- **Priority:** major

### RM-006 — Negative: roadmap 404 before any plan / 409 before completion
- **Roles:** Candidate
- **Steps:** 1) Fresh candidate (no plan) `GET /career/me/roadmap`. 2) After POST, immediately GET before completion.
- **Expected:** 404 when no plan exists; 409 while `status != completed`.
- **Priority:** major

---

# NOT-YET-BUILT MODULES (templates only)

> The TCs below are **best-guess skeletons** for modules that are **not implemented**. Endpoints, request/response shapes, and RBAC are **assumptions** based on the pattern of built modules and the platform spec. Rewrite each against the real implementation before executing.

## Module 10 — Recruiter Management System (prefix `RC-`)

> **STATUS: NOT YET IMPLEMENTED — template only, do not execute.**

### RC-001 — Recruiter creates/manages a job requisition *(assumption)*
- **Roles (assumed):** Recruiter/admin
- **Steps (assumed):** 1) POST a requisition. 2) List/GET it.
- **Expected (assumed):** Requisition created and retrievable; candidate role 403.
- **Priority:** major · *Assumption to revise once built.*

### RC-002 — Recruiter shortlists a candidate against a requisition *(assumption)*
- **Steps (assumed):** 1) Add a candidate to a shortlist. 2) Retrieve the shortlist.
- **Expected (assumed):** Candidate appears on the shortlist; RBAC enforced.
- **Priority:** major · *Assumption.*

### RC-003 — RBAC: candidate cannot access recruiter management *(assumption)*
- **Expected (assumed):** Candidate token → 403 on all recruiter-management routes.
- **Priority:** major · *Assumption.*

### RC-004 — Negative: unknown requisition id → 404 *(assumption)*
- **Priority:** minor · *Assumption.*

## Module 11 — HR Screening System (prefix `HR-`)

> **STATUS: NOT YET IMPLEMENTED — template only, do not execute.**

### HR-001 — Create a screening stage/checklist for a candidate *(assumption)*
- **Priority:** major · *Assumption.*
### HR-002 — Advance/record a screening decision *(assumption)*
- **Priority:** major · *Assumption.*
### HR-003 — RBAC: only hr_reviewer/admin may screen *(assumption)*
- **Priority:** major · *Assumption.*
### HR-004 — Negative: screen an unknown candidate → 404 *(assumption)*
- **Priority:** minor · *Assumption.*

## Module 12 — Employer Portal (prefix `EP-`)

> **STATUS: NOT YET IMPLEMENTED — template only, do not execute.**

### EP-001 — Employer views their organization's postings/candidates *(assumption)*
- **Priority:** major · *Assumption.*
### EP-002 — Employer cannot see other organizations' data *(assumption)*
- **Priority:** critical · *Assumption (tenant isolation).*
### EP-003 — RBAC: only employer/admin access the portal *(assumption)*
- **Priority:** major · *Assumption.*
### EP-004 — Negative: unauthorized org access → 403/404 *(assumption)*
- **Priority:** minor · *Assumption.*

## Module 13 — AI Job Matching Engine (prefix `JM-`)

> **STATUS: NOT YET IMPLEMENTED — template only, do not execute.**

### JM-001 — Match a candidate to jobs, ranked by score *(assumption)*
- **Priority:** critical · *Assumption.*
### JM-002 — Match respects filters (location/skills/experience) *(assumption)*
- **Priority:** major · *Assumption.*
### JM-003 — Empty result when no job matches *(assumption)*
- **Priority:** minor · *Assumption.*
### JM-004 — RBAC on matching routes *(assumption)*
- **Priority:** major · *Assumption.*

## Module 14 — Candidate Ranking Engine (prefix `CRK-`)

> **STATUS: NOT YET IMPLEMENTED — template only, do not execute.**

### CRK-001 — Rank candidates for a requisition/benchmark *(assumption)*
- **Priority:** critical · *Assumption.*
### CRK-002 — Ranking is stable/deterministic for identical inputs *(assumption)*
- **Priority:** major · *Assumption.*
### CRK-003 — RBAC: staff/admin only *(assumption)*
- **Priority:** major · *Assumption.*
### CRK-004 — Negative: rank against unknown requisition → 404 *(assumption)*
- **Priority:** minor · *Assumption.*

## Module 15 — Learning & Certification Marketplace (prefix `LM-`)

> **STATUS: NOT YET IMPLEMENTED — template only, do not execute.**

### LM-001 — Browse/search learning & certification catalog *(assumption)*
- **Priority:** major · *Assumption.*
### LM-002 — Enroll / mark interest in an item *(assumption)*
- **Priority:** major · *Assumption.*
### LM-003 — Recommendations link into marketplace items *(assumption)*
- **Priority:** minor · *Assumption (ties to Module 8).*
### LM-004 — RBAC / auth on enrollment *(assumption)*
- **Priority:** minor · *Assumption.*

## Module 16 — HR Consultation Platform (prefix `HC-`)

> **STATUS: NOT YET IMPLEMENTED — template only, do not execute.**

### HC-001 — Book a consultation slot *(assumption)*
- **Priority:** major · *Assumption.*
### HC-002 — View/cancel a booked consultation *(assumption)*
- **Priority:** major · *Assumption.*
### HC-003 — RBAC: candidate books, consultant/admin manages *(assumption)*
- **Priority:** major · *Assumption.*
### HC-004 — Negative: double-book / unknown slot → 409/404 *(assumption)*
- **Priority:** minor · *Assumption.*

## Module 17 — Analytics & Reporting (prefix `AR-`)

> **STATUS: NOT YET IMPLEMENTED — template only, do not execute.**

### AR-001 — Aggregate platform metrics render for staff/admin *(assumption)*
- **Priority:** major · *Assumption.*
### AR-002 — Report figures reconcile with source data *(assumption)*
- **Priority:** major · *Assumption.*
### AR-003 — RBAC: reporting is staff/admin only *(assumption)*
- **Priority:** major · *Assumption.*
### AR-004 — Export / date-range filter behavior *(assumption)*
- **Priority:** minor · *Assumption.*
