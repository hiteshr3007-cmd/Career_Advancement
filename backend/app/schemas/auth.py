import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole

# Public self-registration must never elevate to administrator.
PUBLIC_REGISTER_ROLES = {
    UserRole.CANDIDATE,
    UserRole.RECRUITER,
    UserRole.HR_REVIEWER,
    UserRole.EMPLOYER,
}


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole = UserRole.CANDIDATE

    @field_validator("role")
    @classmethod
    def reject_privileged_self_registration(cls, value: UserRole) -> UserRole:
        if value not in PUBLIC_REGISTER_ROLES:
            raise ValueError(
                "Self-registration as administrator is not allowed. "
                "Ask an existing administrator to provision privileged accounts."
            )
        return value


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
