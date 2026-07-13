"""LLM narrative/enhancement layer.

Each function takes an already-computed deterministic result and asks the LLM to
add human-readable narrative or a richer structure, GROUNDED in that result.
Every function is defensive: on any LLM problem it raises/propagates
LLMUnavailable, and callers (pipeline.py) fall back to deterministic output.
"""
from __future__ import annotations

from phase3.llm.base import LLMProvider, LLMUnavailable
from phase3.schemas import (
    CandidateSnapshot,
    CareerRoadmap,
    DetailedGapReport,
    RecommendationSet,
    RoadmapAction,
    RoadmapPhase,
)

_ROADMAP_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "phases": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "horizon": {"type": "string"},
                    "goal": {"type": "string"},
                    "actions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "action": {"type": "string"},
                                "focus_area": {"type": "string"},
                                "detail": {"type": "string"},
                            },
                            "required": ["action", "focus_area"],
                        },
                    },
                },
                "required": ["horizon", "goal", "actions"],
            },
        },
    },
    "required": ["summary", "phases"],
}


def _candidate_brief(candidate: CandidateSnapshot) -> str:
    return (
        f"Candidate: {candidate.current_designation or 'N/A'}, "
        f"{candidate.total_experience_years} yrs experience, "
        f"industry={candidate.industry or 'N/A'}, "
        f"skills={', '.join(candidate.skills[:15]) or 'none listed'}."
    )


def narrate_gap_report(provider: LLMProvider, candidate: CandidateSnapshot, report: DetailedGapReport) -> str:
    schema = {"type": "object", "properties": {"narrative": {"type": "string"}}, "required": ["narrative"]}
    top_gaps = ", ".join(g.skill for g in report.skill_gaps[:6]) or "none"
    prompt = (
        f"{_candidate_brief(candidate)}\n"
        f"Target roles: {', '.join(report.target_benchmarks) or 'N/A'}.\n"
        f"Overall readiness: {report.overall_readiness_score}/100 ({report.overall_recommendation}).\n"
        f"Top skill gaps: {top_gaps}. Experience shortfall: {report.experience_gap_years} yrs.\n"
        f"Write a concise (3-4 sentence), encouraging but honest assessment of where this candidate "
        f"stands relative to their target roles and what matters most to close first. Do not invent facts."
    )
    result = provider.generate_structured(
        system="You are a career coach summarizing a candidate's readiness. Be specific and grounded.",
        prompt=prompt, schema=schema,
    )
    text = result.get("narrative")
    if not text:
        raise LLMUnavailable("LLM returned empty gap narrative")
    return text.strip()


def narrate_recommendations(provider: LLMProvider, candidate: CandidateSnapshot, recs: RecommendationSet) -> str:
    schema = {"type": "object", "properties": {"narrative": {"type": "string"}}, "required": ["narrative"]}
    skills = ", ".join(r.skill for r in recs.learning[:8]) or "none"
    prompt = (
        f"{_candidate_brief(candidate)}\n"
        f"Recommended focus skills: {skills}.\n"
        f"Missing certifications: {', '.join(c.skill for c in recs.certifications) or 'none'}.\n"
        f"Write a short (2-3 sentence) prioritization: what to tackle first and why, given typical "
        f"effort/impact. Reference only the skills/certs listed above."
    )
    result = provider.generate_structured(
        system="You are a career coach prioritizing a learning plan. Be concrete.",
        prompt=prompt, schema=schema,
    )
    text = result.get("narrative")
    if not text:
        raise LLMUnavailable("LLM returned empty recommendation narrative")
    return text.strip()


def generate_roadmap_llm(
    provider: LLMProvider,
    candidate: CandidateSnapshot,
    report: DetailedGapReport,
    recs: RecommendationSet,
    target_role: str | None,
) -> CareerRoadmap:
    gap_lines = "; ".join(f"{g.skill} ({g.priority_band})" for g in report.skill_gaps[:10]) or "none"
    cert_lines = ", ".join(c.skill for c in recs.certifications) or "none"
    prompt = (
        f"{_candidate_brief(candidate)}\n"
        f"Target role: {target_role or 'career advancement'}.\n"
        f"Prioritized skill gaps: {gap_lines}.\n"
        f"Missing certifications: {cert_lines}.\n"
        f"Experience shortfall: {report.experience_gap_years} yrs. Readiness: {report.overall_readiness_score}/100.\n\n"
        f"Produce a career roadmap with exactly four phases with horizons '30-day', '90-day', "
        f"'180-day', and '12-month'. Each phase needs a one-line goal and 2-4 concrete actions "
        f"(each with a focus_area of skill/certification/resume/experience/networking). Sequence the "
        f"highest-priority gaps earliest and the certifications/experience-building later. "
        f"Only reference the skills, certifications, and gaps listed above."
    )
    result = provider.generate_structured(
        system="You are an expert career coach building a time-phased development plan. "
               "Ground every action in the provided gaps.",
        prompt=prompt, schema=_ROADMAP_SCHEMA,
    )
    phases_raw = result.get("phases") or []
    if not phases_raw:
        raise LLMUnavailable("LLM returned no roadmap phases")
    phases = []
    for p in phases_raw:
        actions = [
            RoadmapAction(
                action=a.get("action", ""),
                focus_area=a.get("focus_area", "skill"),
                detail=a.get("detail"),
            )
            for a in (p.get("actions") or []) if a.get("action")
        ]
        phases.append(RoadmapPhase(horizon=p.get("horizon", ""), goal=p.get("goal", ""), actions=actions))
    return CareerRoadmap(
        target_role=target_role,
        summary=result.get("summary"),
        phases=phases,
        generated_by=f"llm:{provider.name}",
    )
