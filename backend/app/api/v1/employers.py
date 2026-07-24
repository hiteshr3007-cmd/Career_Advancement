"""Phase 5 — Employer company profiles (Module 12: Employer Profiles)."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.database import get_db
from app.models.job import EmployerProfile
from app.models.user import User, UserRole
from app.schemas.job import EmployerProfileOut, EmployerProfileUpdate

router = APIRouter(prefix="/employers", tags=["Employer Portal (Phase 5)"])

STAFF_ROLES = (
    UserRole.RECRUITER.value,
    UserRole.HR_REVIEWER.value,
    UserRole.EMPLOYER.value,
    UserRole.ADMINISTRATOR.value,
)


def _get_or_create(db: Session, user_id: uuid.UUID) -> EmployerProfile:
    profile = db.query(EmployerProfile).filter(EmployerProfile.user_id == user_id).first()
    if not profile:
        profile = EmployerProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("/me", response_model=EmployerProfileOut)
def get_my_employer_profile(
    current_user: User = Depends(require_roles(UserRole.EMPLOYER.value, UserRole.ADMINISTRATOR.value)),
    db: Session = Depends(get_db),
):
    return _get_or_create(db, current_user.id)


@router.put("/me", response_model=EmployerProfileOut)
def update_my_employer_profile(
    payload: EmployerProfileUpdate,
    current_user: User = Depends(require_roles(UserRole.EMPLOYER.value, UserRole.ADMINISTRATOR.value)),
    db: Session = Depends(get_db),
):
    profile = _get_or_create(db, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/{user_id}", response_model=EmployerProfileOut)
def get_employer_profile(
    user_id: uuid.UUID,
    current_user: User = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    profile = db.query(EmployerProfile).filter(EmployerProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employer profile not found")
    return profile
