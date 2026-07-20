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


# Admin-tier roles are managed exclusively by super admins (see superadmin.py).
# Regular admins cannot create or assign these; super admins cannot assign
# anything outside this set through their endpoints.
ADMIN_TIER_ROLES = {UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN}


class SuperAdminUserCreate(BaseModel):
    """Super-admin-only creation of an administrator (or super_admin) account."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole = UserRole.ADMINISTRATOR

    @field_validator("role")
    @classmethod
    def role_must_be_admin_tier(cls, value: UserRole) -> UserRole:
        if value not in ADMIN_TIER_ROLES:
            raise ValueError(
                "Super admins manage administrator and super_admin accounts only. "
                "Use /admin/users for candidate/staff accounts."
            )
        return value


class SuperAdminRoleUpdate(BaseModel):
    """Super-admin-only role change, constrained to the admin tier."""
    role: UserRole

    @field_validator("role")
    @classmethod
    def role_must_be_admin_tier(cls, value: UserRole) -> UserRole:
        if value not in ADMIN_TIER_ROLES:
            raise ValueError("A super admin can only assign administrator or super_admin here.")
        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Kept for internal use (building the refresh cookie); the access-only
    shape below is what actually goes out over the wire — see NEW-2."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessTokenResponse(BaseModel):
    """What /auth/login, /auth/refresh, and /auth/register-login actually
    return. The refresh token travels only as an httpOnly cookie (NEW-2), so
    it's deliberately absent from this body."""
    access_token: str
    token_type: str = "bearer"


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
