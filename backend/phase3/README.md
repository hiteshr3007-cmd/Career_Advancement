# Phase 3 (standalone) — Gap Analysis · Recommendations · Career Roadmap

This package implements Phase 3 (Modules 7, 8, 9) **in isolation**. It is **not
wired into the FastAPI backend** — nothing in `app/` imports it and it imports
nothing from `app/`. The goal is to verify it works on its own first, then
integrate deliberately.

## What's here

| Module | File | LLM? |
|---|---|---|
| 7 — Gap Analysis Engine | `gap_analysis.py`, `resume_quality.py` | No (LLM narrative optional) |
| 8 — Recommendation Engine | `recommendations.py`, `course_catalog.py` | No (LLM narrative optional) |
| 9 — Career Roadmap Generator | `roadmap.py` (scaffold), `narrative.py` (LLM) | LLM-enhanced, deterministic fallback |
| LLM abstraction | `llm/` (`base`, `openai_compatible`, `factory`) | — |
| Orchestrator | `pipeline.py` → `run_phase3()` | — |
| Contracts | `schemas.py` (DB-free Pydantic) | — |
| Demo | `demo.py` | — |

## Design principles

- **Deterministic core, LLM as enhancement.** Every module produces a complete
  result with no LLM. The LLM only adds narrative (Modules 7, 8) or a richer
  roadmap (Module 9). If the LLM is disabled or unreachable, you still get full,
  useful output — the pipeline never hard-fails on an LLM problem.
- **DB-free.** Everything operates on plain Pydantic models (`schemas.py`), not
  SQLAlchemy. That's what lets it run without a database or server, and makes
  integration a simple mapping step later.
- **Swappable LLM.** All modules depend only on the `LLMProvider` interface.
  Ollama and OpenAI share one implementation (they differ only by config);
  Claude would be one new class. See "Switching the LLM" below.

## Run the demo (no DB, no server, no Ollama needed)

Deterministic only:
```
PHASE3_LLM_ENABLED=false .venv/Scripts/python -m phase3.demo
```
With the LLM layer attempted (falls back cleanly if Ollama isn't running):
```
.venv/Scripts/python -m phase3.demo
```

## Enabling the Ollama LLM layer

1. Install Ollama (https://ollama.com), then pull a model:
   ```
   ollama pull llama3.1:8b      # or: ollama pull qwen2.5:7b  (often better at JSON)
   ```
   Ollama serves an OpenAI-compatible API at `http://localhost:11434/v1`.
2. Make sure the `openai` SDK is installed in the venv (it's used as the client
   for Ollama's OpenAI-compatible endpoint):
   ```
   .venv/Scripts/pip install openai
   ```
3. Run the demo (defaults already point at local Ollama):
   ```
   .venv/Scripts/python -m phase3.demo
   ```
   You should see `LLM used: True`, an LLM gap narrative, a recommendation
   narrative, and a roadmap with `generated_by: llm:...`.

## Configuration (env vars, all optional — defaults target local Ollama)

| Var | Default | Purpose |
|---|---|---|
| `PHASE3_LLM_ENABLED` | `true` | Master switch for the LLM layer |
| `PHASE3_LLM_PROVIDER` | `ollama` | `ollama` \| `openai` (Claude later) |
| `PHASE3_LLM_BASE_URL` | `http://localhost:11434/v1` | Ollama endpoint; blank for real OpenAI |
| `PHASE3_LLM_MODEL` | `llama3.1:8b` | Model name |
| `PHASE3_LLM_API_KEY` | `ollama` | Ignored by Ollama; real key for OpenAI |
| `PHASE3_LLM_TIMEOUT` | `90` | Seconds |

## Switching the LLM later

- **Ollama → OpenAI:** set `PHASE3_LLM_PROVIDER=openai`, `PHASE3_LLM_API_KEY=<real key>`,
  `PHASE3_LLM_MODEL=gpt-4o-mini`. No code change (same OpenAI-compatible client).
- **→ Claude:** add an `AnthropicProvider(LLMProvider)` class and one branch in
  `llm/factory.py`. Nothing in Modules 7/8/9 changes.

## How integration will work (later, once you confirm)

`run_phase3(candidate, matches)` is the only entry point. Integration is a thin
adapter — no rewrite of Phase 3:

1. Map DB rows → Phase 3 inputs:
   - `CandidateProfile` (+ skills/education/experience) → `CandidateSnapshot`
   - each `CandidateBenchmarkMatch` (+ its `Benchmark`) → `BenchmarkMatchInput`
     (its `gap_summary` JSON already matches the `GapSummary` schema exactly)
2. Call `run_phase3(...)` in a background task (like resume parsing), persist the
   `Phase3Result` to new tables, expose it via new routes under `/api/v1`
   (e.g. `/gap-report/me`, `/recommendations/me`, `/roadmap/me`).
3. Add Phase 3 env vars to `.env` / config and the router registration.

Until then, this package is completely inert with respect to the running backend.
