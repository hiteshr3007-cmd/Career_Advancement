# Test Cases — AI Career Growth & Talent Intelligence Platform

This directory holds the reusable, living QA test-case library for the platform. It is extended each QA pass; sections are only regenerated wholesale when the underlying feature is significantly reworked.

## Files

| File | Scope |
|------|-------|
| `frontend-test-cases.md` | Frontend features shipped in a release (currently the 2026-07-20 release). Organized one section per feature. |
| `backend-test-cases.md` | Module-level engine coverage. **Modules 7–9 are live** (real, executable TCs). **Modules 10–17 are placeholders** (templates only — do not execute). |

## Naming convention

Each TC has an ID of the form `<PREFIX>-<NNN>` where the prefix identifies the feature/module. IDs are stable — never renumber an existing TC; append new ones.

### Frontend release prefixes (`frontend-test-cases.md`)

| Prefix | Feature |
|--------|---------|
| `GAP-` | Gap Analysis page |
| `ROAD-` | Career Roadmap page |
| `PWR-` | Password-reset email delivery |
| `SET-` | Settings page |
| `THM-` | Theme toggle (light/dark) |
| `DARK-` | Dark-mode legibility across dashboard pages |
| `FZ-` | Fix verification: "0% ready, no gaps" messaging |
| `FL-` | Fix verification: dev-mode reset-link logging |
| `FM-` | Fix verification: Benchmarks detail modal dark mode |

### Backend module prefixes (`backend-test-cases.md`)

**Live (execute these):**

| Prefix | Module |
|--------|--------|
| `GA-` | Module 7 — Gap Analysis Engine |
| `CR-` | Module 8 — Career Recommendation Engine |
| `RM-` | Module 9 — Career Roadmap Generator |

**Placeholder — NOT YET IMPLEMENTED (do not execute):**

| Prefix | Module |
|--------|--------|
| `RC-` | Module 10 — Recruiter Management System |
| `HR-` | Module 11 — HR Screening System |
| `EP-` | Module 12 — Employer Portal |
| `JM-` | Module 13 — AI Job Matching Engine |
| `CRK-` | Module 14 — Candidate Ranking Engine |
| `LM-` | Module 15 — Learning & Certification Marketplace |
| `HC-` | Module 16 — HR Consultation Platform |
| `AR-` | Module 17 — Analytics & Reporting |

## Live vs. template distinction

- **Live TCs** describe behavior that exists today and can be run against the running app/backend now.
- **Template/placeholder TCs** are best-guess skeletons for modules that are **not built yet**. Each is banner-marked `STATUS: NOT YET IMPLEMENTED — template only, do not execute`. Their steps/expected-results are assumptions based on the pattern of already-built modules and **must be rewritten against the real implementation** once the module ships.

## Workflow when a Module 10–17 feature ships

1. Pull that module's placeholder TCs.
2. Rewrite them against the real, running implementation (real endpoints, request/response shapes, RBAC).
3. Remove the `STATUS: NOT YET IMPLEMENTED` banner.
4. Only then start executing them. **Never execute placeholder TCs against nothing.**

## Priority scale

`critical` (blocks core flow / data loss / security), `major` (feature broken or wrong but flow survives), `minor` (cosmetic / edge-case / nice-to-have).
