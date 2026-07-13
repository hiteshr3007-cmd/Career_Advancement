"""Administration — user management (administrator only).

Company staff (recruiters, HR reviewers, employers — who can view all candidate
PII) are created here, not via public registration. Admins can also create
additional admins/candidates.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.core.security import hash_password
from app.database import get_db
from app.models.candidate import CandidateProfile
from app.models.user import User, UserRole
from app.schemas.auth import AdminRoleUpdate, AdminUserCreate, UserOut

router = APIRouter(prefix="/admin", tags=["Administration"])

ADMIN_ONLY = require_roles(UserRole.ADMINISTRATOR.value)


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminUserCreate,
    current_user: User = Depends(ADMIN_ONLY),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role.value,
        is_active=True,
        is_verified=True,  # admin-created accounts are trusted
    )
    db.add(user)
    db.flush()

    # Only candidates get a candidate profile.
    if user.role == UserRole.CANDIDATE.value:
        db.add(CandidateProfile(user_id=user.id))

    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=list[UserOut])
def list_users(
    role: UserRole | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(ADMIN_ONLY),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if role is not None:
        query = query.filter(User.role == role.value)
    return query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()


@router.patch("/users/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: uuid.UUID,
    payload: AdminRoleUpdate,
    current_user: User = Depends(ADMIN_ONLY),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot change your own role")

    user.role = payload.role.value

    # Moving a user into the candidate role: give them a profile if they don't
    # already have one (e.g. they were created as staff and are being
    # reassigned). Moving a user out of candidate intentionally leaves any
    # existing profile in place rather than deleting their data.
    if user.role == UserRole.CANDIDATE.value:
        has_profile = (
            db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
        )
        if not has_profile:
            db.add(CandidateProfile(user_id=user.id))

    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(
    user_id: uuid.UUID,
    current_user: User = Depends(ADMIN_ONLY),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/activate", response_model=UserOut)
def activate_user(
    user_id: uuid.UUID,
    current_user: User = Depends(ADMIN_ONLY),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user
