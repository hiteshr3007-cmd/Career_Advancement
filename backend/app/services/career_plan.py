"""Phase 3 integration adapter.

Maps Phase 2 DB rows (CandidateProfile, CandidateBenchmarkMatch + Benchmark)
into the DB-free phase3 input schemas, runs the phase3 pipeline, and persists
the result on the candidate's CareerPlan row. Generation runs in a background
task with its own session (same pattern as resume parsing).
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from app.database import SessionLocal
from app.models.benchmark import Benchmark
from app.models.candidate import CandidateProfile
from app.models.career_plan import CareerPlan
from app.models.match import CandidateBenchmarkMatch
from app.career_intelligence.pipeline import run_phase3
from app.career_intelligence.schemas import (
    BenchmarkMatchInput,
    CandidateSnapshot,
    EducationSnapshot,
    ExperienceSnapshot,
    GapSummary,
)

logger = logging.getLogger(__name__)


def build_candidate_snapshot(profile: CandidateProfile) -> CandidateSnapshot:
    return CandidateSnapshot(
        full_name=profile.user.full_name if profile.user else None,
        current_designation=profile.current_designation,
        industry=profile.industry,
        functional_area=profile.functional_area,
        experience_level=profile.experience_level,
        total_experience_years=profile.total_experience_years or 0.0,
        summary=profile.summary,
        skills=[s.name for s in profile.skills],
        certifications=list(profile.certifications or []),
        experiences=[
            ExperienceSnapshot(
                title=e.title,
                company=e.company,
                description=e.description,
                is_current=e.is_current,
            )
            for e in profile.experiences
        ],
        education=[
            EducationSnapshot(
                degree=e.degree,
                field_of_study=e.field_of_study,
                institution=e.institution,
            )
            for e in profile.education
        ],
    )


def build_match_inputs(db: Session, candidate_id: uuid.UUID) -> list[BenchmarkMatchInput]:
    rows = (
        db.query(CandidateBenchmarkMatch, Benchmark)
        .join(Benchmark, CandidateBenchmarkMatch.benchmark_id == Benchmark.id)
        .filter(CandidateBenchmarkMatch.candidate_id == candidate_id)
        .all()
    )
    return [
        BenchmarkMatchInput(
            benchmark_name=benchmark.name,
            benchmark_level=benchmark.level,
            benchmark_category=benchmark.category,
            match_score=match.match_score,
            readiness_score=match.readiness_score,
            # gap_summary JSON was produced by phase 2's engine in exactly the
            # GapSummary shape; validate defensively so a malformed row can't
            # kill the whole generation.
            gap_summary=GapSummary.model_validate(match.gap_summary or {}),
        )
        for match, benchmark in rows
    ]


def load_profile_for_snapshot(db: Session, candidate_id: uuid.UUID) -> CandidateProfile | None:
    return (
        db.query(CandidateProfile)
        .options(
            joinedload(CandidateProfile.user),
            joinedload(CandidateProfile.skills),
            joinedload(CandidateProfile.education),
            joinedload(CandidateProfile.experiences),
        )
        .filter(CandidateProfile.id == candidate_id)
        .first()
    )


def generate_career_plan(plan_id: uuid.UUID) -> None:
    """Background task: run the Phase 3 pipeline and persist onto the plan row."""
    db = SessionLocal()
    try:
        plan = db.get(CareerPlan, plan_id)
        if not plan:
            return
        plan.status = "processing"
        db.commit()

        try:
            profile = load_profile_for_snapshot(db, plan.candidate_id)
            if not profile:
                raise ValueError("Candidate profile not found")

            candidate = build_candidate_snapshot(profile)
            matches = build_match_inputs(db, plan.candidate_id)

            result = run_phase3(candidate, matches)

            plan.gap_report = result.gap_report.model_dump()
            plan.recommendations = result.recommendations.model_dump()
            plan.roadmap = result.roadmap.model_dump()
            plan.llm_used = result.llm_used
            plan.notes = result.notes
            plan.generated_at = datetime.now(timezone.utc)
            plan.status = "completed"
            plan.error = None
            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.exception("Career plan generation failed for %s", plan_id)
            plan.status = "failed"
            plan.error = str(exc)
            db.commit()
    finally:
        db.close()
