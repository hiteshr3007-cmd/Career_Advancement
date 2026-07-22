"""Phase 3 — Gap Analysis, Recommendations, Career Roadmap.

Standalone and NOT wired into the FastAPI app yet. Everything here operates on
plain Pydantic data structures (see schemas.py), not SQLAlchemy models or DB
sessions, so it can be tested in isolation with `python -m app.career_intelligence.demo`.

Integration (later, once verified) is a thin adapter that maps existing
CandidateProfile + CandidateBenchmarkMatch rows into these inputs and exposes
run_phase3() through new API routes.
"""
