"""Employability scorecard endpoints.

Candidate self-view (/scorecard/me) and staff/admin view of any candidate
(/scorecard/candidates/{id}), mirroring the career-intelligence routes. The
scorecard is computed on demand from current profile data (no stored row).
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.database import get_db
from app.models.candidate import CandidateProfile
from app.models.user import User, UserRole
from app.schemas.scorecard import ScorecardOut
from app.services.scorecard import build_scorecard

router = APIRouter(prefix="/scorecard", tags=["Scorecard"])

VIEWER_ROLES = (
    UserRole.RECRUITER.value,
    UserRole.HR_REVIEWER.value,
    UserRole.EMPLOYER.value,
    UserRole.ADMINISTRATOR.value,
)


@router.get("/me", response_model=ScorecardOut)
def get_my_scorecard(
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    candidate_id = (
        db.query(CandidateProfile.id).filter(CandidateProfile.user_id == current_user.id).scalar()
    )
    if not candidate_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    scorecard = build_scorecard(db, candidate_id)
    if scorecard is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    return scorecard


@router.get("/candidates/{candidate_id}", response_model=ScorecardOut)
def get_candidate_scorecard(
    candidate_id: uuid.UUID,
    current_user: User = Depends(require_roles(*VIEWER_ROLES)),
    db: Session = Depends(get_db),
):
    scorecard = build_scorecard(db, candidate_id)
    if scorecard is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    return scorecard
