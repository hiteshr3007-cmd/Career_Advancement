"""Module 9 — Career Roadmap Generator (deterministic scaffold).

Produces a sensible 30/90/180/365-day plan purely from the gap report and
recommendations, with no LLM. This is both a standalone deliverable and the
fallback the pipeline uses when the LLM is unavailable. The LLM version
(narrative.generate_roadmap_llm) produces a richer plan over the same inputs.
"""
from __future__ import annotations

from phase3.schemas import (
    CareerRoadmap,
    DetailedGapReport,
    RecommendationSet,
    RoadmapAction,
    RoadmapPhase,
)


def build_roadmap_scaffold(
    report: DetailedGapReport,
    recs: RecommendationSet,
    target_role: str | None,
) -> CareerRoadmap:
    high = [g for g in report.skill_gaps if g.priority_band == "high"]
    medium = [g for g in report.skill_gaps if g.priority_band == "medium"]
    low = [g for g in report.skill_gaps if g.priority_band == "low"]

    # 30-day: quick wins — top skills + resume fixes.
    d30_actions: list[RoadmapAction] = []
    for g in (high or medium)[:2]:
        d30_actions.append(RoadmapAction(
            action=f"Start learning {g.skill}",
            focus_area="skill",
            detail=f"{g.priority_band}-priority gap for {', '.join(g.needed_by_benchmarks) or 'target role'}.",
        ))
    for imp in report.resume_issues[:2]:
        d30_actions.append(RoadmapAction(
            action=f"Fix resume: {imp.type.replace('_', ' ')}",
            focus_area="resume",
            detail=imp.suggestion,
        ))
    if not d30_actions:
        d30_actions.append(RoadmapAction(
            action="Polish resume and confirm target roles",
            focus_area="resume",
            detail="No high-priority skill gaps detected — focus on positioning.",
        ))

    # 90-day: finish high-priority skills, begin a certification.
    d90_actions: list[RoadmapAction] = []
    for g in high[2:] + medium[:2]:
        d90_actions.append(RoadmapAction(action=f"Reach working proficiency in {g.skill}", focus_area="skill"))
    if recs.certifications:
        cert = recs.certifications[0]
        d90_actions.append(RoadmapAction(
            action=f"Begin studying for {cert.title}", focus_area="certification", detail=cert.provider,
        ))
    if not d90_actions:
        d90_actions.append(RoadmapAction(action="Build a portfolio project applying new skills", focus_area="skill"))

    # 180-day: remaining skills + complete a certification.
    d180_actions: list[RoadmapAction] = []
    for g in medium[2:] + low[:2]:
        d180_actions.append(RoadmapAction(action=f"Round out {g.skill}", focus_area="skill"))
    if recs.certifications:
        d180_actions.append(RoadmapAction(
            action=f"Complete certification: {recs.certifications[0].title}", focus_area="certification",
        ))
    if report.experience_gap_years > 0:
        d180_actions.append(RoadmapAction(
            action="Take on a stretch project that demonstrates target-level responsibility",
            focus_area="experience",
        ))
    if not d180_actions:
        d180_actions.append(RoadmapAction(action="Deepen expertise and start interviewing", focus_area="experience"))

    # 12-month: seniority, experience gap, positioning.
    d365_actions: list[RoadmapAction] = [
        RoadmapAction(action="Apply/interview for target roles", focus_area="networking"),
        RoadmapAction(action="Build a track record of quantified achievements to strengthen your resume",
                      focus_area="resume"),
    ]
    if report.experience_gap_years > 0:
        d365_actions.insert(0, RoadmapAction(
            action=f"Accumulate ~{report.experience_gap_years:.1f} yr of target-level experience via role/scope growth",
            focus_area="experience",
        ))

    phases = [
        RoadmapPhase(horizon="30-day", goal="Quick wins: start top skill gaps and fix resume basics", actions=d30_actions),
        RoadmapPhase(horizon="90-day", goal="Reach proficiency in high-priority skills; begin a certification", actions=d90_actions),
        RoadmapPhase(horizon="180-day", goal="Close remaining skill gaps and complete a certification", actions=d180_actions),
        RoadmapPhase(horizon="12-month", goal="Build seniority/experience and target the role actively", actions=d365_actions),
    ]

    return CareerRoadmap(
        target_role=target_role,
        summary=f"Deterministic roadmap toward {target_role or 'your target role'} based on "
                f"{len(report.skill_gaps)} identified skill gap(s) and readiness "
                f"{report.overall_readiness_score}/100.",
        phases=phases,
        generated_by="deterministic",
    )
