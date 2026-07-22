"""Employability scorecard.

Consolidates existing signals (resume quality, benchmark readiness, project/
certification counts) with a new per-skill score into the Metric/Current/
Target/Status card from the product spec.

Per-skill score (0-100) blends, per the handwritten spec, evidence that the
skill is real — "mentioned in the resume" and "used in a project" — with the
candidate's proficiency and their manual 1-5 self-rating.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.benchmark import Benchmark
from app.models.candidate import CandidateProfile, CandidateSkill
from app.models.match import CandidateBenchmarkMatch
from app.services.career_plan import build_candidate_snapshot
from app.career_intelligence.resume_quality import analyze_resume_quality

PROFICIENCY_100 = {"beginner": 40, "intermediate": 60, "advanced": 80, "expert": 100}
PROJECTS_TARGET = 5
CERTS_TARGET = 3
_SEVERITY_PENALTY = {"high": 15, "medium": 8, "low": 3}


def _skill_score(skill: CandidateSkill, projects_text: str) -> tuple[int, bool, bool]:
    prof = PROFICIENCY_100.get((skill.proficiency or "").strip().lower(), 50)
    in_resume = skill.source == "resume"
    in_project = bool(skill.name) and skill.name.strip().lower() in projects_text
    evidence = 50 * int(in_resume) + 50 * int(in_project)  # 0 / 50 / 100
    if skill.manual_score:
        manual_100 = skill.manual_score * 20  # 1..5 -> 20..100
        raw = 0.45 * prof + 0.30 * manual_100 + 0.25 * evidence
    else:
        raw = 0.65 * prof + 0.35 * evidence
    return round(min(100.0, raw)), in_resume, in_project


def _status(current: float, target: float) -> str:
    if target <= 0:
        return "Good"
    ratio = current / target
    if ratio >= 1:
        return "Good"
    if ratio >= 0.8:
        return "Medium"
    if ratio >= 0.5:
        return "Improve"
    return "Critical"


def _resume_score(db: Session, profile: CandidateProfile) -> int:
    """100 minus penalties from the resume-quality analyzer. Required-skill
    keywords for the ATS check come from active benchmarks in the candidate's
    industry (or all active benchmarks when no industry is set)."""
    snapshot = build_candidate_snapshot(profile)
    query = db.query(Benchmark).filter(Benchmark.is_active.is_(True))
    if profile.industry:
        query = query.filter(Benchmark.category.ilike(f"%{profile.industry}%"))
    required: set[str] = set()
    for bench in query.limit(20).all():
        required.update(s.lower() for s in (bench.required_skills or []))
    issues = analyze_resume_quality(snapshot, sorted(required))
    penalty = sum(_SEVERITY_PENALTY.get(i.severity, 5) for i in issues)
    return max(0, 100 - penalty)


def build_scorecard(db: Session, candidate_id: uuid.UUID) -> dict | None:
    profile = (
        db.query(CandidateProfile)
        .options(
            joinedload(CandidateProfile.user),
            selectinload(CandidateProfile.skills),
            selectinload(CandidateProfile.experiences),
            selectinload(CandidateProfile.education),
        )
        .filter(CandidateProfile.id == candidate_id)
        .first()
    )
    if not profile:
        return None

    projects_text = " ".join(str(p) for p in (profile.projects or [])).lower()
    skill_scores = []
    for skill in profile.skills:
        score, in_resume, in_project = _skill_score(skill, projects_text)
        skill_scores.append({
            "name": skill.name,
            "proficiency": skill.proficiency,
            "manual_score": skill.manual_score,
            "in_resume": in_resume,
            "in_project": in_project,
            "score": score,
        })
    # Highest-scoring skills first — most useful ordering for the UI.
    skill_scores.sort(key=lambda s: s["score"], reverse=True)

    technical = round(sum(s["score"] for s in skill_scores) / len(skill_scores)) if skill_scores else 0
    resume_score = _resume_score(db, profile)
    projects_count = len(profile.projects or [])
    certs_count = len(profile.certifications or [])
    projects_100 = min(100, round(projects_count / PROJECTS_TARGET * 100))
    certs_100 = min(100, round(certs_count / CERTS_TARGET * 100))
    employability = round(
        0.40 * technical + 0.25 * resume_score + 0.20 * projects_100 + 0.15 * certs_100
    )
    best_readiness = (
        db.query(func.max(CandidateBenchmarkMatch.readiness_score))
        .filter(CandidateBenchmarkMatch.candidate_id == candidate_id)
        .scalar()
    )

    metrics = [
        {"metric": "Employability Score", "current": employability, "target": 90, "unit": "score",
         "status": _status(employability, 90)},
        {"metric": "Technical Skills", "current": technical, "target": 90, "unit": "score",
         "status": _status(technical, 90)},
        {"metric": "Resume Score", "current": resume_score, "target": 95, "unit": "score",
         "status": _status(resume_score, 95)},
        {"metric": "Projects", "current": projects_count, "target": PROJECTS_TARGET, "unit": "count",
         "status": _status(projects_count, PROJECTS_TARGET)},
        {"metric": "Certifications", "current": certs_count, "target": CERTS_TARGET, "unit": "count",
         "status": _status(certs_count, CERTS_TARGET)},
    ]

    return {
        "candidate_id": candidate_id,
        "employability_score": employability,
        "technical_skills_score": technical,
        "resume_score": resume_score,
        "projects_count": projects_count,
        "certifications_count": certs_count,
        "benchmark_readiness": best_readiness,
        "metrics": metrics,
        "skill_scores": skill_scores,
        "generated_at": datetime.now(timezone.utc),
    }
