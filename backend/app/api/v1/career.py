"""Phase 3 — Career Intelligence endpoints (Modules 7, 8, 9).

Generation is async (background task, like resume parsing): POST .../generate
returns the plan row with status=pending; poll GET until status=completed.
If the candidate has no computed benchmark matches yet, generation computes
them first so the plan isn't built from an empty gap set.
"""
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.matching import _load_candidate_for_matching, _run_matching
from app.core.deps import require_roles
from app.database import get_db
from app.models.candidate import CandidateProfile
from app.models.career_plan import CareerPlan
from app.models.match import CandidateBenchmarkMatch
from app.models.user import User, UserRole
from app.schemas.career_plan import CareerPlanOut, CareerPlanStatusOut
from app.services.career_plan import generate_career_plan

router = APIRouter(prefix="/career", tags=["Career Intelligence (Phase 3)"])

VIEWER_ROLES = (
    UserRole.RECRUITER.value,
    UserRole.HR_REVIEWER.value,
    UserRole.EMPLOYER.value,
    UserRole.ADMINISTRATOR.value,
)


def _own_candidate_id(db: Session, user: User) -> uuid.UUID:
    candidate_id = (
        db.query(CandidateProfile.id).filter(CandidateProfile.user_id == user.id).scalar()
    )
    if not candidate_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    return candidate_id


def _start_generation(
    db: Session, background_tasks: BackgroundTasks, candidate_id: uuid.UUID
) -> CareerPlan:
    # Plan quality depends on benchmark matches — compute them first if absent.
    has_matches = (
        db.query(CandidateBenchmarkMatch.id)
        .filter(CandidateBenchmarkMatch.candidate_id == candidate_id)
        .first()
    )
    if not has_matches:
        candidate = _load_candidate_for_matching(db, candidate_id)
        _run_matching(db, candidate, benchmark_id=None)

    plan = db.query(CareerPlan).filter(CareerPlan.candidate_id == candidate_id).first()
    if plan and plan.status == "processing":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Career plan generation already in progress",
        )
    if not plan:
        plan = CareerPlan(candidate_id=candidate_id)
        db.add(plan)
    plan.status = "pending"
    plan.error = None
    db.commit()
    db.refresh(plan)

    background_tasks.add_task(generate_career_plan, plan.id)
    return plan


def _get_plan(db: Session, candidate_id: uuid.UUID) -> CareerPlan:
    plan = db.query(CareerPlan).filter(CareerPlan.candidate_id == candidate_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No career plan generated yet — POST .../generate first",
        )
    return plan


def _completed_section(plan: CareerPlan, section: dict | None) -> dict:
    if plan.status != "completed" or section is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Career plan not ready (status: {plan.status})",
        )
    return section


# ---------------- candidate (own plan) ----------------

@router.post("/me/generate", response_model=CareerPlanStatusOut, status_code=status.HTTP_202_ACCEPTED)
def generate_my_plan(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    candidate_id = _own_candidate_id(db, current_user)
    return _start_generation(db, background_tasks, candidate_id)


@router.get("/me", response_model=CareerPlanOut)
def get_my_plan(
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    return _get_plan(db, _own_candidate_id(db, current_user))


@router.get("/me/gap-report")
def get_my_gap_report(
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    plan = _get_plan(db, _own_candidate_id(db, current_user))
    return _completed_section(plan, plan.gap_report)


@router.get("/me/recommendations")
def get_my_recommendations(
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    plan = _get_plan(db, _own_candidate_id(db, current_user))
    return _completed_section(plan, plan.recommendations)


@router.get("/me/roadmap")
def get_my_roadmap(
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    plan = _get_plan(db, _own_candidate_id(db, current_user))
    return _completed_section(plan, plan.roadmap)


# ---------------- company staff / admin (any candidate) ----------------

@router.post(
    "/candidates/{candidate_id}/generate",
    response_model=CareerPlanStatusOut,
    status_code=status.HTTP_202_ACCEPTED,
)
def generate_candidate_plan(
    candidate_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_roles(*VIEWER_ROLES)),
    db: Session = Depends(get_db),
):
    if not db.get(CandidateProfile, candidate_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    return _start_generation(db, background_tasks, candidate_id)


@router.get("/candidates/{candidate_id}", response_model=CareerPlanOut)
def get_candidate_plan(
    candidate_id: uuid.UUID,
    current_user: User = Depends(require_roles(*VIEWER_ROLES)),
    db: Session = Depends(get_db),
):
    if not db.get(CandidateProfile, candidate_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    return _get_plan(db, candidate_id)
