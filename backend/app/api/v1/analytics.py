"""Phase 6 — Analytics & Reporting (Module 17).

Aggregate talent-intelligence views for staff/admin: platform overview KPIs,
the hiring funnel, and skill supply vs demand across the candidate pool and open
requisitions. Read-only; all metrics are computed live.
"""
from collections import Counter

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.database import get_db
from app.models.candidate import CandidateProfile, CandidateSkill
from app.models.consultation import Consultation
from app.models.job import Job
from app.models.learning import Enrollment
from app.models.pipeline import PIPELINE_STAGES, PipelineEntry
from app.models.user import User, UserRole
from app.schemas.analytics import (
    OverviewOut,
    PipelineFunnelOut,
    SkillAnalyticsOut,
    SkillCount,
    SkillGap,
)

router = APIRouter(prefix="/analytics", tags=["Analytics & Reporting (Phase 6)"])

STAFF_ROLES = (
    UserRole.RECRUITER.value,
    UserRole.HR_REVIEWER.value,
    UserRole.EMPLOYER.value,
    UserRole.ADMINISTRATOR.value,
)


@router.get("/overview", response_model=OverviewOut)
def overview(
    current_user: User = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    avg_completeness = db.query(func.avg(CandidateProfile.profile_completeness)).scalar()
    return OverviewOut(
        candidates=db.query(func.count(CandidateProfile.id)).scalar() or 0,
        jobs_total=db.query(func.count(Job.id)).scalar() or 0,
        jobs_open=db.query(func.count(Job.id)).filter(Job.status == "open").scalar() or 0,
        applications_total=db.query(func.count(PipelineEntry.id)).scalar() or 0,
        hires=db.query(func.count(PipelineEntry.id)).filter(PipelineEntry.stage == "hired").scalar() or 0,
        enrollments_total=db.query(func.count(Enrollment.id)).scalar() or 0,
        consultations_open=db.query(func.count(Consultation.id))
        .filter(Consultation.status.in_(("requested", "confirmed")))
        .scalar()
        or 0,
        avg_profile_completeness=round(float(avg_completeness or 0.0), 2),
    )


@router.get("/pipeline", response_model=PipelineFunnelOut)
def pipeline_funnel(
    job_id: str | None = Query(None),
    current_user: User = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    query = db.query(PipelineEntry.stage, func.count(PipelineEntry.id))
    if job_id:
        query = query.filter(PipelineEntry.job_id == job_id)
    rows = query.group_by(PipelineEntry.stage).all()
    counts = {stage: 0 for stage in PIPELINE_STAGES}
    for stage, cnt in rows:
        counts[stage] = cnt
    return PipelineFunnelOut(
        stage_counts=counts,
        total=sum(counts.values()),
        hires=counts.get("hired", 0),
        rejected=counts.get("rejected", 0),
    )


@router.get("/skills", response_model=SkillAnalyticsOut)
def skill_analytics(
    top: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    # Supply: how many candidates list each skill (case-insensitive).
    supply_rows = (
        db.query(func.lower(CandidateSkill.name), func.count(CandidateSkill.id))
        .group_by(func.lower(CandidateSkill.name))
        .all()
    )
    supply_map = {name: cnt for name, cnt in supply_rows}

    # Demand: required skills across OPEN jobs (JSON arrays aggregated in Python).
    demand_counter: Counter = Counter()
    for (req,) in db.query(Job.required_skills).filter(Job.status == "open").all():
        for skill in req or []:
            key = str(skill).strip().lower()
            if key:
                demand_counter[key] += 1

    supply = [
        SkillCount(name=n, count=c)
        for n, c in sorted(supply_map.items(), key=lambda kv: kv[1], reverse=True)[:top]
    ]
    demand = [
        SkillCount(name=n, count=c)
        for n, c in demand_counter.most_common(top)
    ]
    # Gaps: in-demand skills the candidate pool is short on (demand - supply).
    gaps = []
    for name, dcount in demand_counter.items():
        scount = supply_map.get(name, 0)
        gaps.append(SkillGap(name=name, demand=dcount, supply=scount, gap=dcount - scount))
    gaps.sort(key=lambda g: g.gap, reverse=True)
    return SkillAnalyticsOut(supply=supply, demand=demand, top_gaps=gaps[:top])
