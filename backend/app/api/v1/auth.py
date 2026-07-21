import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config import settings
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models.candidate import CandidateProfile
from app.services.email import send_password_reset_email
from app.models.user import PasswordResetToken, RefreshToken, User, UserRole
from app.schemas.auth import (
    AccessTokenResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    UserLogin,
    UserOut,
    UserRegister,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Scoped to /auth so the cookie isn't sent on every API call, just the
# handful of auth endpoints that need it (NEW-2 hardening).
REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth"

# Password-reset code (OTP) settings.
RESET_CODE_TTL_MINUTES = 15
RESET_CODE_MAX_ATTEMPTS = 5
# Same generic failure message for every confirm failure (missing user, wrong /
# expired / locked code) so the endpoint never reveals which one it was.
_RESET_GENERIC_ERROR = "Invalid or expired code"


def _generate_reset_code() -> str:
    """6-digit numeric code, zero-padded."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
    )


def _issue_tokens(db: Session, user: User, response: Response) -> AccessTokenResponse:
    access_token = create_access_token(str(user.id), user.role)
    refresh_token = create_refresh_token(str(user.id), user.role)

    db.add(
        RefreshToken(
            user_id=user.id,
            token=refresh_token,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
            created_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    _set_refresh_cookie(response, refresh_token)
    return AccessTokenResponse(access_token=access_token)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # The schema already restricts public self-registration to candidate. On top
    # of that, an email on an allowlist is granted a privileged role here — so
    # the "few admin/super-admin emails" simply register normally and are
    # elevated. Super admin takes precedence if an email is on both lists.
    email_lower = payload.email.lower()
    if email_lower in settings.super_admin_email_set:
        role = UserRole.SUPER_ADMIN.value
    elif email_lower in settings.admin_email_set:
        role = UserRole.ADMINISTRATOR.value
    else:
        role = payload.role.value

    privileged = {UserRole.ADMINISTRATOR.value, UserRole.SUPER_ADMIN.value}
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=role,
        is_verified=(role in privileged),
    )
    db.add(user)
    db.flush()

    if user.role == UserRole.CANDIDATE.value:
        db.add(CandidateProfile(user_id=user.id))

    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=AccessTokenResponse)
def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    return _issue_tokens(db, user, response)


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    try:
        token_payload = decode_token(refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    if token_payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    stored = db.query(RefreshToken).filter(RefreshToken.token == refresh_token).first()
    if not stored or stored.revoked or stored.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired or revoked")

    user = db.get(User, uuid.UUID(token_payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    stored.revoked = True
    db.commit()

    return _issue_tokens(db, user, response)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token:
        stored = db.query(RefreshToken).filter(RefreshToken.token == refresh_token).first()
        if stored:
            stored.revoked = True
            db.commit()
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
    return None


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/password-reset/request", status_code=status.HTTP_202_ACCEPTED)
def request_password_reset(
    payload: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        # Invalidate any earlier unused codes so only the newest one works.
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used.is_(False),
        ).update({"used": True})
        code = _generate_reset_code()
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token=code,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=RESET_CODE_TTL_MINUTES),
            )
        )
        db.commit()
        # Sent after the response so a slow/unreachable mail server can't delay
        # or affect this endpoint's anti-enumeration behavior either way.
        background_tasks.add_task(send_password_reset_email, user.email, user.full_name, code)
    return {"detail": "If that email exists, a reset code has been sent."}


@router.post("/password-reset/confirm", status_code=status.HTTP_200_OK)
def confirm_password_reset(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    generic_error = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST, detail=_RESET_GENERIC_ERROR
    )
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise generic_error

    # Newest unused code for this user.
    reset_entry = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used.is_(False),
        )
        .order_by(PasswordResetToken.expires_at.desc())
        .first()
    )
    if not reset_entry or reset_entry.expires_at < datetime.now(timezone.utc):
        raise generic_error

    # Lock the code once too many wrong guesses have been made (brute-force cap).
    if reset_entry.attempts >= RESET_CODE_MAX_ATTEMPTS:
        reset_entry.used = True
        db.commit()
        raise generic_error

    if not secrets.compare_digest(reset_entry.token, payload.code):
        reset_entry.attempts += 1
        if reset_entry.attempts >= RESET_CODE_MAX_ATTEMPTS:
            reset_entry.used = True  # burn the code after the final wrong try
        db.commit()
        raise generic_error

    # Correct code — reset the password, consume the code, revoke sessions.
    user.hashed_password = hash_password(payload.new_password)
    reset_entry.used = True
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).update({"revoked": True})
    db.commit()
    return {"detail": "Password updated successfully"}
