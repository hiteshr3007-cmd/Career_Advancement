"""Phase 3 orchestrator — the single seam integration will call.

run_phase3(candidate, matches) -> Phase3Result

Runs Module 7 -> 8 -> 9 deterministically, then (if enabled and reachable)
enriches with the LLM narrative layer. Any LLM failure degrades gracefully to
the deterministic output — the function never raises on LLM problems.
"""
from __future__ import annotations

from phase3.config import settings
from phase3.gap_analysis import build_gap_report
from phase3.llm.base import LLMUnavailable
from phase3.narrative import generate_roadmap_llm, narrate_gap_report, narrate_recommendations
from phase3.recommendations import build_recommendations
from phase3.roadmap import build_roadmap_scaffold
from phase3.schemas import BenchmarkMatchInput, CandidateSnapshot, Phase3Result


def _pick_target_role(matches: list[BenchmarkMatchInput]) -> str | None:
    if not matches:
        return None
    # The role the candidate is closest to is the natural primary target.
    return max(matches, key=lambda m: m.readiness_score).benchmark_name


def run_phase3(
    candidate: CandidateSnapshot,
    matches: list[BenchmarkMatchInput],
    use_llm: bool | None = None,
) -> Phase3Result:
    notes: list[str] = []

    # ---- Deterministic core (always runs) ----
    gap_report = build_gap_report(candidate, matches)
    recommendations, rec_notes = build_recommendations(gap_report, candidate)
    notes.extend(rec_notes)
    target_role = _pick_target_role(matches)
    roadmap = build_roadmap_scaffold(gap_report, recommendations, target_role)

    # ---- Optional LLM enhancement (graceful) ----
    want_llm = settings.llm_enabled if use_llm is None else use_llm
    llm_used = False

    if want_llm:
        try:
            from phase3.llm.factory import get_provider
            provider = get_provider()
            if not provider.health():
                raise LLMUnavailable(f"LLM provider '{provider.name}' not reachable")

            # Each enhancement is independent — one failing shouldn't sink the rest.
            try:
                gap_report.narrative = narrate_gap_report(provider, candidate, gap_report)
                llm_used = True
            except LLMUnavailable as exc:
                notes.append(f"Gap narrative skipped: {exc}")

            try:
                recommendations.narrative = narrate_recommendations(provider, candidate, recommendations)
                llm_used = True
            except LLMUnavailable as exc:
                notes.append(f"Recommendation narrative skipped: {exc}")

            try:
                roadmap = generate_roadmap_llm(provider, candidate, gap_report, recommendations, target_role)
                llm_used = True
            except LLMUnavailable as exc:
                notes.append(f"LLM roadmap skipped, using deterministic scaffold: {exc}")

        except LLMUnavailable as exc:
            notes.append(f"LLM layer unavailable, deterministic output only: {exc}")
        except Exception as exc:  # never let the LLM layer break the pipeline
            notes.append(f"LLM layer error, deterministic output only: {exc}")
    else:
        notes.append("LLM layer disabled (PHASE3_LLM_ENABLED=false or use_llm=False) — deterministic output.")

    return Phase3Result(
        gap_report=gap_report,
        recommendations=recommendations,
        roadmap=roadmap,
        llm_used=llm_used,
        notes=notes,
    )
