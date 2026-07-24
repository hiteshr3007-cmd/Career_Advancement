"""Phase 6 — Learning & Certification Marketplace (Module 15).

Candidate-facing: browse recommended learning, enroll, and track progress.
Completing an item feeds back into the candidate's skills (see services/learning.py).
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.deps import require_roles
from app.database import get_db
from app.models.candidate import CandidateProfile
from app.models.learning import Enrollment
from app.models.user import User, UserRole
from app.schemas.learning import (
    CatalogItemOut,
    EnrollmentCreate,
    EnrollmentOut,
    EnrollmentUpdate,
)
from app.services.learning import apply_completion, build_catalog

router = APIRouter(prefix="/learning", tags=["Learning Marketplace (Phase 6)"])


def _get_candidate(db: Session, user: User) -> CandidateProfile:
    profile = (
        db.query(CandidateProfile)
        .options(selectinload(CandidateProfile.skills))
        .filter(CandidateProfile.user_id == user.id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    return profile


@router.get("/catalog", response_model=list[CatalogItemOut])
def get_catalog(
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    candidate = _get_candidate(db, current_user)
    return build_catalog(db, candidate)


@router.post("/enrollments", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
def enroll(
    payload: EnrollmentCreate,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    candidate = _get_candidate(db, current_user)
    enrollment = Enrollment(candidate_id=candidate.id, **payload.model_dump())
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.get("/enrollments/me", response_model=list[EnrollmentOut])
def my_enrollments(
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    candidate = _get_candidate(db, current_user)
    return (
        db.query(Enrollment)
        .filter(Enrollment.candidate_id == candidate.id)
        .order_by(Enrollment.created_at.desc())
        .all()
    )


def _load_own_enrollment(db: Session, candidate_id: uuid.UUID, enrollment_id: uuid.UUID) -> Enrollment:
    enrollment = db.get(Enrollment, enrollment_id)
    if not enrollment or enrollment.candidate_id != candidate_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")
    return enrollment


@router.patch("/enrollments/{enrollment_id}", response_model=EnrollmentOut)
def update_enrollment(
    enrollment_id: uuid.UUID,
    payload: EnrollmentUpdate,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    candidate = _get_candidate(db, current_user)
    enrollment = _load_own_enrollment(db, candidate.id, enrollment_id)

    was_completed = enrollment.status == "completed"
    data = payload.model_dump(exclude_unset=True)
    if "progress_pct" in data:
        enrollment.progress_pct = data["progress_pct"]
        if data["progress_pct"] >= 100 and "status" not in data:
            enrollment.status = "completed"
    if "status" in data:
        enrollment.status = data["status"]

    # Transition into completed → run the re-scoring loop once.
    if enrollment.status == "completed" and not was_completed:
        enrollment.progress_pct = 100
        enrollment.completed_at = datetime.now(timezone.utc)
        apply_completion(db, enrollment)

    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.delete("/enrollments/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enrollment(
    enrollment_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    candidate = _get_candidate(db, current_user)
    enrollment = _load_own_enrollment(db, candidate.id, enrollment_id)
    db.delete(enrollment)
    db.commit()
