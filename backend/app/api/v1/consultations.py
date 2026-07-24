"""Phase 6 — HR Consultation Platform (Module 16).

Candidates request consultations (career guidance / resume review / interview
prep); HR reviewers, recruiters, and admins pick them up, confirm a time, and
mark them complete. Candidates may withdraw their own pending requests.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.database import get_db
from app.models.candidate import CandidateProfile
from app.models.consultation import CONSULTATION_STATUSES, Consultation
from app.models.user import User, UserRole
from app.schemas.consultation import (
    ConsultationCreate,
    ConsultationOut,
    ConsultationUpdate,
)

router = APIRouter(prefix="/consultations", tags=["HR Consultation Platform (Phase 6)"])

STAFF_ROLES = (
    UserRole.HR_REVIEWER.value,
    UserRole.RECRUITER.value,
    UserRole.ADMINISTRATOR.value,
)


def _to_out(db: Session, c: Consultation) -> ConsultationOut:
    profile = db.get(CandidateProfile, c.candidate_id)
    cand_user = profile.user if profile else None
    advisor = db.get(User, c.advisor_id) if c.advisor_id else None
    out = ConsultationOut.model_validate(c)
    out.candidate_name = cand_user.full_name if cand_user else None
    out.advisor_name = advisor.full_name if advisor else None
    return out


def _get_candidate(db: Session, user: User) -> CandidateProfile:
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    return profile


@router.post("", response_model=ConsultationOut, status_code=status.HTTP_201_CREATED)
def request_consultation(
    payload: ConsultationCreate,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    candidate = _get_candidate(db, current_user)
    consultation = Consultation(
        candidate_id=candidate.id,
        session_type=payload.session_type,
        topic=payload.topic,
        requested_time=payload.requested_time,
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return _to_out(db, consultation)


@router.get("/me", response_model=list[ConsultationOut])
def my_consultations(
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    candidate = _get_candidate(db, current_user)
    rows = (
        db.query(Consultation)
        .filter(Consultation.candidate_id == candidate.id)
        .order_by(Consultation.created_at.desc())
        .all()
    )
    return [_to_out(db, c) for c in rows]


@router.get("", response_model=list[ConsultationOut])
def list_consultations(
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    if status_filter is not None and status_filter not in CONSULTATION_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"status must be one of: {', '.join(CONSULTATION_STATUSES)}",
        )
    query = db.query(Consultation)
    if status_filter:
        query = query.filter(Consultation.status == status_filter)
    rows = query.order_by(Consultation.created_at.desc()).offset(offset).limit(limit).all()
    return [_to_out(db, c) for c in rows]


@router.patch("/{consultation_id}", response_model=ConsultationOut)
def manage_consultation(
    consultation_id: uuid.UUID,
    payload: ConsultationUpdate,
    current_user: User = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    consultation = db.get(Consultation, consultation_id)
    if not consultation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(consultation, field, value)
    # Assign the advisor when a staff member confirms an unassigned request.
    if data.get("status") == "confirmed" and consultation.advisor_id is None:
        consultation.advisor_id = current_user.id
    db.commit()
    db.refresh(consultation)
    return _to_out(db, consultation)


@router.delete("/{consultation_id}", status_code=status.HTTP_204_NO_CONTENT)
def withdraw_consultation(
    consultation_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    candidate = _get_candidate(db, current_user)
    consultation = db.get(Consultation, consultation_id)
    if not consultation or consultation.candidate_id != candidate.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found")
    db.delete(consultation)
    db.commit()
