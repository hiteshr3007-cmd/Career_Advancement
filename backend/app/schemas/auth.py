import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole

# Only candidates may self-register publicly. Administrators are granted via the
# email allowlist (see auth.register); recruiters/HR reviewers/employers are
# created by an admin only (see /admin/users). This prevents anyone
# self-elevating to a PII-viewing role.
PUBLIC_REGISTER_ROLES = {UserRole.CANDIDATE}


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole = UserRole.CANDIDATE

    @field_validator("role")
    @classmethod
    def role_must_be_public(cls, value: UserRole) -> UserRole:
        if value not in PUBLIC_REGISTER_ROLES:
            raise ValueError(
                f"Cannot self-register as '{value.value}'. Candidates self-register; "
                f"administrators are set via the admin email allowlist; recruiters/HR "
                f"reviewers/employers are created by an admin."
            )
        return value


class AdminUserCreate(BaseModel):
    """Admin-only user provisioning (recruiters, HR reviewers, employers, additional admins, etc.)."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole = UserRole.RECRUITER


class AdminRoleUpdate(BaseModel):
    """Admin-only role change for an existing user."""
    role: UserRole


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    is_verified: bool
