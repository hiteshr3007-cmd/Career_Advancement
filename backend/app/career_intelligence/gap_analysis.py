"""Module 7 — Gap Analysis Engine (deterministic core).

Aggregates the per-benchmark gap_summary data that Phase 2 already computes into
a single prioritized DetailedGapReport, and layers in resume-quality issues.
No LLM required — the optional narrative is added separately in narrative.py.
"""
from __future__ import annotations

from app.career_intelligence.resume_quality import analyze_resume_quality
from app.career_intelligence.schemas import (
    BenchmarkMatchInput,
    CandidateSnapshot,
    DetailedGapReport,
    PrioritizedSkillGap,
)


def _band(priority: float) -> str:
    if priority >= 0.66:
        return "high"
    if priority >= 0.33:
        return "medium"
    return "low"


def _prioritize_skill_gaps(matches: list[BenchmarkMatchInput]) -> list[PrioritizedSkillGap]:
    """Rank missing skills by how many target benchmarks need them, weighting
    required gaps above preferred, and gaps in low-readiness targets higher."""
    n = max(len(matches), 1)
    # skill -> {kind, benchmarks, weight}
    acc: dict[str, dict] = {}

    for m in matches:
        # Lower readiness => the gaps in this target are more urgent.
        urgency = 1.0 - min(max(m.readiness_score, 0.0), 100.0) / 100.0
        for skill in m.gap_summary.skill_gap.missing_required:
            key = skill.strip().lower()
            entry = acc.setdefault(key, {"skill": skill, "kind": "required", "benchmarks": set(), "weight": 0.0})
            entry["kind"] = "required"
            entry["benchmarks"].add(m.benchmark_name)
            entry["weight"] += 1.0 + urgency
        for skill in m.gap_summary.skill_gap.missing_preferred:
            key = skill.strip().lower()
            entry = acc.setdefault(key, {"skill": skill, "kind": "preferred", "benchmarks": set(), "weight": 0.0})
            if entry["kind"] != "required":  # don't downgrade a required gap
                entry["kind"] = "preferred"
            entry["benchmarks"].add(m.benchmark_name)
            entry["weight"] += 0.4 + 0.4 * urgency

    if not acc:
        return []

    max_weight = max(e["weight"] for e in acc.values()) or 1.0
    gaps = []
    for entry in acc.values():
        priority = round(entry["weight"] / max_weight, 3)
        gaps.append(PrioritizedSkillGap(
            skill=entry["skill"],
            kind=entry["kind"],
            needed_by_benchmarks=sorted(entry["benchmarks"]),
            priority=priority,
            priority_band=_band(priority),
        ))
    # Required first, then by priority, then alphabetically for stability.
    gaps.sort(key=lambda g: (0 if g.kind == "required" else 1, -g.priority, g.skill.lower()))
    return gaps


def build_gap_report(
    candidate: CandidateSnapshot,
    matches: list[BenchmarkMatchInput],
) -> DetailedGapReport:
    if not matches:
        # Still run resume checks so the report is useful even with no benchmarks.
        return DetailedGapReport(
            overall_readiness_score=0.0,
            overall_recommendation="not_ready",
            resume_issues=analyze_resume_quality(candidate, required_skills=[]),
        )

    # Overall readiness: use the best-matching target (the role they're closest to).
    best = max(matches, key=lambda m: m.readiness_score)
    overall_readiness = round(sum(m.readiness_score for m in matches) / len(matches), 2)

    # Union of missing certs across targets; experience gap = worst (largest) shortfall.
    missing_certs: set[str] = set()
    max_exp_gap = 0.0
    for m in matches:
        missing_certs.update(c for c in m.gap_summary.certification_gap.missing if c.strip())
        max_exp_gap = max(max_exp_gap, m.gap_summary.experience_gap.years_short)

    # Resume checks are keyed off the union of required skills across targets.
    required_union: list[str] = []
    seen = set()
    for m in matches:
        for s in m.gap_summary.skill_gap.missing_required:
            if s.lower() not in seen:
                seen.add(s.lower())
                required_union.append(s)

    return DetailedGapReport(
        overall_readiness_score=overall_readiness,
        overall_recommendation=best.gap_summary.overall_recommendation,
        target_benchmarks=[m.benchmark_name for m in matches],
        skill_gaps=_prioritize_skill_gaps(matches),
        missing_certifications=sorted(missing_certs),
        experience_gap_years=round(max_exp_gap, 1),
        resume_issues=analyze_resume_quality(candidate, required_union),
    )
