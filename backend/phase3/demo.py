"""Standalone Phase 3 demo — run with:  python -m phase3.demo

Builds a realistic candidate + Phase-2-style benchmark matches (the exact shape
CandidateBenchmarkMatch produces), runs the full pipeline, and prints the three
deliverables. Needs NO database and NO running server.

The deterministic output always prints. The LLM narrative prints only if an
Ollama (or other configured) provider is reachable; otherwise the demo notes it
was skipped and shows the deterministic roadmap.
"""
from __future__ import annotations

import json

from phase3.pipeline import run_phase3
from phase3.schemas import (
    BenchmarkMatchInput,
    CandidateSnapshot,
    CertificationGap,
    ExperienceGap,
    ExperienceSnapshot,
    GapSummary,
    SkillGap,
)


def sample_candidate() -> CandidateSnapshot:
    return CandidateSnapshot(
        full_name="Sam Rivera",
        current_designation="Backend Developer",
        industry="Information Technology",
        functional_area="Software Engineering",
        experience_level="mid",
        total_experience_years=3.0,
        summary="Backend developer working with Python and PostgreSQL on internal APIs.",
        skills=["python", "postgresql", "sql", "git"],
        certifications=[],
        experiences=[
            ExperienceSnapshot(
                title="Backend Developer",
                company="Acme Corp",
                is_current=True,
                description=(
                    "Responsible for maintaining internal APIs. "
                    "Worked on database queries. "
                    "Helped with deployments."
                ),
            ),
        ],
    )


def sample_matches() -> list[BenchmarkMatchInput]:
    """Two target roles. The candidate lacks fastapi/docker/aws and a cert, and
    is a bit short on experience for the senior target — so gaps are non-trivial."""
    return [
        BenchmarkMatchInput(
            benchmark_name="Mid-Level Backend Engineer",
            benchmark_level="mid",
            benchmark_category="Information Technology",
            match_score=72.0,
            readiness_score=68.0,
            gap_summary=GapSummary(
                skill_gap=SkillGap(
                    missing_required=["fastapi", "docker"],
                    missing_preferred=["aws"],
                    required_match_ratio=0.6,
                ),
                certification_gap=CertificationGap(missing=["aws certified"], match_ratio=0.0),
                experience_gap=ExperienceGap(years_short=0.0, candidate_years=3.0, benchmark_min_years=3.0),
                overall_recommendation="developing",
            ),
        ),
        BenchmarkMatchInput(
            benchmark_name="Senior Backend Engineer",
            benchmark_level="senior",
            benchmark_category="Information Technology",
            match_score=55.0,
            readiness_score=48.0,
            gap_summary=GapSummary(
                skill_gap=SkillGap(
                    missing_required=["fastapi", "docker", "kubernetes"],
                    missing_preferred=["aws", "leadership"],
                    required_match_ratio=0.45,
                ),
                certification_gap=CertificationGap(missing=["aws certified", "cka"], match_ratio=0.0),
                experience_gap=ExperienceGap(years_short=2.0, candidate_years=3.0, benchmark_min_years=5.0),
                overall_recommendation="not_ready",
            ),
        ),
    ]


def main() -> None:
    candidate = sample_candidate()
    matches = sample_matches()

    result = run_phase3(candidate, matches)

    print("=" * 72)
    print("PHASE 3 DEMO  —  candidate:", candidate.full_name)
    print("LLM used:", result.llm_used)
    print("=" * 72)

    print("\n########## MODULE 7 — DETAILED GAP REPORT ##########")
    gr = result.gap_report
    print(f"Overall readiness: {gr.overall_readiness_score}/100  ({gr.overall_recommendation})")
    print(f"Target benchmarks: {', '.join(gr.target_benchmarks)}")
    print(f"Experience gap: {gr.experience_gap_years} yr")
    print("Prioritized skill gaps:")
    for g in gr.skill_gaps:
        print(f"  - [{g.priority_band:<6}] {g.skill:<12} ({g.kind}) needed by: {', '.join(g.needed_by_benchmarks)}")
    print(f"Missing certifications: {', '.join(gr.missing_certifications) or 'none'}")
    print("Resume issues:")
    for i in gr.resume_issues:
        print(f"  - [{i.severity}] {i.type}: {i.detail}")
    if gr.narrative:
        print(f"\nLLM narrative:\n  {gr.narrative}")

    print("\n########## MODULE 8 — RECOMMENDATIONS ##########")
    rs = result.recommendations
    print("Learning:")
    for r in rs.learning:
        print(f"  - {r.skill:<12} -> {r.title} ({r.provider}) [{r.resource_type}]")
    print("Certifications:")
    for r in rs.certifications:
        print(f"  - {r.skill:<14} -> {r.title} ({r.provider})")
    print("Resume improvements:")
    for r in rs.resume_improvements:
        print(f"  - {r.issue_type}: {r.recommendation}")
    print("Career development:")
    for c in rs.career_development:
        print(f"  - {c}")
    if rs.narrative:
        print(f"\nLLM narrative:\n  {rs.narrative}")

    print("\n########## MODULE 9 — CAREER ROADMAP ##########")
    rm = result.roadmap
    print(f"Target role: {rm.target_role}   (generated_by: {rm.generated_by})")
    if rm.summary:
        print(f"Summary: {rm.summary}")
    for phase in rm.phases:
        print(f"\n  [{phase.horizon}] {phase.goal}")
        for a in phase.actions:
            detail = f" — {a.detail}" if a.detail else ""
            print(f"      * ({a.focus_area}) {a.action}{detail}")

    if result.notes:
        print("\n########## PIPELINE NOTES ##########")
        for n in result.notes:
            print(f"  - {n}")

    print("\n(Full result as JSON is available via result.model_dump_json())")


if __name__ == "__main__":
    main()
