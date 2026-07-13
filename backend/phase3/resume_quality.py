"""Deterministic resume-quality checks (part of Module 7 — Gap Analysis).

Detects ATS/keyword gaps, weak achievement bullets, and missing quantification
without any LLM. Operates purely on the CandidateSnapshot text.
"""
from __future__ import annotations

import re

from phase3.schemas import CandidateSnapshot, ResumeIssue

# Strong resume action verbs — a bullet that starts with one reads as an
# achievement; one that doesn't often reads as a passive duty.
ACTION_VERBS = {
    "led", "built", "designed", "developed", "implemented", "launched", "created",
    "delivered", "improved", "increased", "reduced", "optimized", "automated",
    "architected", "managed", "drove", "shipped", "scaled", "migrated", "owned",
    "spearheaded", "streamlined", "achieved", "established", "coordinated",
}

NUMBER_RE = re.compile(r"\d")
PERCENT_OR_METRIC_RE = re.compile(r"(\d+%|\$\d+|\d+\s*(x|users|customers|requests|ms|hours|days|weeks))", re.IGNORECASE)


def _candidate_text(candidate: CandidateSnapshot) -> str:
    parts = [candidate.summary or ""]
    for exp in candidate.experiences:
        parts.append(exp.title or "")
        parts.append(exp.description or "")
    parts.extend(candidate.skills)
    parts.extend(candidate.certifications)
    return "\n".join(parts).lower()


def check_ats_keywords(candidate: CandidateSnapshot, required_skills: list[str]) -> list[ResumeIssue]:
    """Flag benchmark-required skills that never appear anywhere in the resume text."""
    text = _candidate_text(candidate)
    missing = [s for s in required_skills if s.strip() and s.strip().lower() not in text]
    if not missing:
        return []
    return [ResumeIssue(
        type="ats_missing_keywords",
        severity="high" if len(missing) >= 3 else "medium",
        detail=f"Required keywords absent from resume text: {', '.join(sorted(set(missing)))}",
        suggestion="Add these terms to your summary or experience bullets where genuinely applicable — "
                   "ATS filters and recruiters search on them verbatim.",
    )]


def check_achievement_quality(candidate: CandidateSnapshot) -> list[ResumeIssue]:
    """Flag experience bullets that read as passive duties or lack quantification."""
    issues: list[ResumeIssue] = []
    weak_bullets = 0
    unquantified = 0
    total_bullets = 0

    for exp in candidate.experiences:
        if not exp.description:
            continue
        # Treat each line / sentence-ish fragment as a bullet.
        bullets = [b.strip() for b in re.split(r"[\n.;]", exp.description) if b.strip()]
        for bullet in bullets:
            total_bullets += 1
            first_word = bullet.split()[0].lower().strip(",:") if bullet.split() else ""
            if first_word not in ACTION_VERBS:
                weak_bullets += 1
            if not NUMBER_RE.search(bullet):
                unquantified += 1

    if total_bullets == 0:
        issues.append(ResumeIssue(
            type="no_experience_detail",
            severity="high",
            detail="No experience descriptions found to evaluate.",
            suggestion="Add 2-4 achievement bullets per role describing what you did and the impact.",
        ))
        return issues

    if weak_bullets / total_bullets > 0.5:
        issues.append(ResumeIssue(
            type="weak_achievement",
            severity="medium",
            detail=f"{weak_bullets} of {total_bullets} bullets don't start with a strong action verb.",
            suggestion="Rewrite duty-style bullets to lead with verbs like Led, Built, Reduced, Automated.",
        ))

    if unquantified / total_bullets > 0.6:
        issues.append(ResumeIssue(
            type="missing_quantification",
            severity="medium",
            detail=f"{unquantified} of {total_bullets} bullets contain no numbers/metrics.",
            suggestion="Quantify impact where possible (%, $, time saved, scale, user counts).",
        ))

    return issues


def analyze_resume_quality(candidate: CandidateSnapshot, required_skills: list[str]) -> list[ResumeIssue]:
    issues: list[ResumeIssue] = []
    issues.extend(check_ats_keywords(candidate, required_skills))
    issues.extend(check_achievement_quality(candidate))
    if not candidate.summary:
        issues.append(ResumeIssue(
            type="missing_summary",
            severity="low",
            detail="No professional summary present.",
            suggestion="Add a 2-3 line summary highlighting your target role, top skills, and experience level.",
        ))
    return issues
