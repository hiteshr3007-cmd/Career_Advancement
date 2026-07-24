import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.learning import ENROLLMENT_KINDS, ENROLLMENT_STATUSES


class EnrollmentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    provider: str | None = None
    url: str | None = None
    kind: str = "course"
    skill_target: str | None = None

    @field_validator("kind")
    @classmethod
    def _valid_kind(cls, v):
        if v not in ENROLLMENT_KINDS:
            raise ValueError(f"kind must be one of: {', '.join(ENROLLMENT_KINDS)}")
        return v


class EnrollmentUpdate(BaseModel):
    """Update progress and/or status. Setting status=completed (or progress=100)
    triggers the re-scoring loop (see app/services/learning.py)."""
    progress_pct: int | None = Field(default=None, ge=0, le=100)
    status: str | None = None

    @field_validator("status")
    @classmethod
    def _valid_status(cls, v):
        if v is not None and v not in ENROLLMENT_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(ENROLLMENT_STATUSES)}")
        return v


class EnrollmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    candidate_id: uuid.UUID
    title: str
    provider: str | None
    url: str | None
    kind: str
    skill_target: str | None
    status: str
    progress_pct: int
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CatalogItemOut(BaseModel):
    """A recommendable learning item derived from the Phase 3 course catalog."""
    title: str
    provider: str | None = None
    url: str | None = None
    kind: str = "course"
    skill_target: str | None = None
