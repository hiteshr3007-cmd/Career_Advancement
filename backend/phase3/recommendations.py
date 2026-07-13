"""Module 8 — Recommendation Engine (deterministic core).

Turns the DetailedGapReport into concrete, grounded recommendations:
  - learning resources for missing skills (from the curated catalog)
  - certification paths for missing certs
  - resume improvements derived from the resume issues
  - career-development guidance from the experience/readiness gap
The optional LLM layer (narrative.py) only prioritizes/rewords — it never
invents resources.
"""
from __future__ import annotations

from phase3.course_catalog import resource_for_certification, resources_for_skill
from phase3.schemas import (
    CandidateSnapshot,
    DetailedGapReport,
    LearningRecommendation,
    RecommendationSet,
    ResumeImprovement,
)

# How many skill gaps (highest priority first) to generate learning recs for.
MAX_SKILL_RECS = 8


def _learning_recommendations(report: DetailedGapReport) -> tuple[list[LearningRecommendation], list[str]]:
    recs: list[LearningRecommendation] = []
    uncatalogued: list[str] = []
    for gap in report.skill_gaps[:MAX_SKILL_RECS]:
        resources = resources_for_skill(gap.skill)
        if not resources:
            uncatalogued.append(gap.skill)
            continue
        for res in resources:
            recs.append(LearningRecommendation(
                skill=gap.skill,
                title=res["title"],
                provider=res["provider"],
                resource_type=res["resource_type"],
                url=res.get("url"),
                rationale=f"Closes a {gap.priority_band}-priority {gap.kind} skill gap "
                          f"(needed by: {', '.join(gap.needed_by_benchmarks) or 'target role'}).",
            ))
    return recs, uncatalogued


def _certification_recommendations(report: DetailedGapReport) -> list[LearningRecommendation]:
    recs: list[LearningRecommendation] = []
    for cert in report.missing_certifications:
        res = resource_for_certification(cert)
        if res:
            recs.append(LearningRecommendation(
                skill=cert,
                title=res["title"],
                provider=res["provider"],
                resource_type=res["resource_type"],
                url=res.get("url"),
                rationale="Required/preferred certification missing from your profile.",
            ))
        else:
            recs.append(LearningRecommendation(
                skill=cert,
                title=f"Obtain: {cert}",
                provider="(research accredited provider)",
                resource_type="certification",
                url=None,
                rationale="Required/preferred certification missing from your profile.",
            ))
    return recs


def _resume_improvements(report: DetailedGapReport) -> list[ResumeImprovement]:
    return [
        ResumeImprovement(issue_type=issue.type, recommendation=issue.suggestion)
        for issue in report.resume_issues
    ]


def _career_development(report: DetailedGapReport, candidate: CandidateSnapshot) -> list[str]:
    items: list[str] = []
    if report.experience_gap_years > 0:
        items.append(
            f"You are ~{report.experience_gap_years:.1f} year(s) short of the experience bar for your "
            f"target role(s). Seek stretch assignments or projects that build seniority signals now."
        )
    if report.overall_recommendation == "ready":
        items.append("You already meet the core bar — focus on differentiation (certifications, "
                     "high-impact achievements) and start applying/interviewing.")
    elif report.overall_recommendation == "developing":
        items.append("You're on track but have visible gaps — prioritize the high-priority skill gaps "
                     "below over the next 3-6 months before targeting these roles.")
    else:
        items.append("Significant gaps remain — build foundational skills first (see high-priority items) "
                     "before targeting these specific roles.")
    high = [g.skill for g in report.skill_gaps if g.priority_band == "high"]
    if high:
        items.append(f"Highest-leverage skills to close first: {', '.join(high[:5])}.")
    return items


def build_recommendations(
    report: DetailedGapReport,
    candidate: CandidateSnapshot,
) -> tuple[RecommendationSet, list[str]]:
    """Returns (RecommendationSet, notes). Notes surface skills with no catalog
    entry so silent coverage gaps are visible."""
    learning, uncatalogued = _learning_recommendations(report)
    rec_set = RecommendationSet(
        learning=learning,
        certifications=_certification_recommendations(report),
        resume_improvements=_resume_improvements(report),
        career_development=_career_development(report, candidate),
    )
    notes: list[str] = []
    if uncatalogued:
        notes.append("No catalog entry for skill(s): " + ", ".join(uncatalogued) +
                     " — deterministic recs omitted (LLM layer or catalog expansion would cover these).")
    return rec_set, notes
