"""Super administration — CRUD over administrator/super_admin accounts only.

A super admin's sole responsibility is the lifecycle of admin-tier accounts:
create them, list them, change between administrator/super_admin, and
deactivate/reactivate them. Super admins deliberately have NO access to
candidate/staff management (that stays with regular admins via /admin) or any
candidate data — see the QA guide's role matrix.

Guard rails:
  - a super admin cannot demote or deactivate their own account (lockout)
  - the last remaining active super admin cannot be demoted/deactivated
    (would leave nobody able to manage admins)
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.core.security import hash_password
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import (
    ADMIN_TIER_ROLES,
    SuperAdminRoleUpdate,
    SuperAdminUserCreate,
    UserOut,
)

router = APIRouter(prefix="/super-admin", tags=["Super Administration"])

SUPER_ADMIN_ONLY = require_roles(UserRole.SUPER_ADMIN.value)

ADMIN_TIER_VALUES = {r.value for r in ADMIN_TIER_ROLES}


def _get_admin_tier_user(db: Session, user_id: uuid.UUID) -> User:
    user = db.get(User, user_id)
    if not user or user.role not in ADMIN_TIER_VALUES:
        # Don't leak the existence of non-admin users through this surface.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin account not found")
    return user


def _would_orphan_super_admins(db: Session, target: User) -> bool:
    """True if removing target's super-admin powers (demote or deactivate) would
    leave zero active super admins."""
    if target.role != UserRole.SUPER_ADMIN.value:
        return False
    remaining = (
        db.query(User)
        .filter(
            User.role == UserRole.SUPER_ADMIN.value,
            User.is_active.is_(True),
            User.id != target.id,
        )
        .count()
    )
    return remaining == 0


@router.post("/admins", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_admin(
    payload: SuperAdminUserCreate,
    current_user: User = Depends(SUPER_ADMIN_ONLY),
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
        is_verified=True,  # super-admin-created accounts are trusted
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/admins", response_model=list[UserOut])
def list_admins(
    role: UserRole | None = Query(None, description="Filter to 'administrator' or 'super_admin'"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(SUPER_ADMIN_ONLY),
    db: Session = Depends(get_db),
):
    query = db.query(User).filter(User.role.in_(ADMIN_TIER_VALUES))
    if role is not None:
        if role not in ADMIN_TIER_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filter role must be administrator or super_admin",
            )
        query = query.filter(User.role == role.value)
    return query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()


@router.patch("/admins/{user_id}/role", response_model=UserOut)
def update_admin_role(
    user_id: uuid.UUID,
    payload: SuperAdminRoleUpdate,
    current_user: User = Depends(SUPER_ADMIN_ONLY),
    db: Session = Depends(get_db),
):
    user = _get_admin_tier_user(db, user_id)
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot change your own role")
    if payload.role.value != UserRole.SUPER_ADMIN.value and _would_orphan_super_admins(db, user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot demote the last active super admin",
        )
    user.role = payload.role.value
    db.commit()
    db.refresh(user)
    return user


@router.patch("/admins/{user_id}/deactivate", response_model=UserOut)
def deactivate_admin(
    user_id: uuid.UUID,
    current_user: User = Depends(SUPER_ADMIN_ONLY),
    db: Session = Depends(get_db),
):
    user = _get_admin_tier_user(db, user_id)
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")
    if _would_orphan_super_admins(db, user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate the last active super admin",
        )
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.patch("/admins/{user_id}/activate", response_model=UserOut)
def activate_admin(
    user_id: uuid.UUID,
    current_user: User = Depends(SUPER_ADMIN_ONLY),
    db: Session = Depends(get_db),
):
    user = _get_admin_tier_user(db, user_id)
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user
