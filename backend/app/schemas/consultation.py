import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.consultation import CONSULTATION_STATUSES, SESSION_TYPES


class ConsultationCreate(BaseModel):
    session_type: str
    topic: str | None = Field(default=None, max_length=255)
    requested_time: datetime | None = None

    @field_validator("session_type")
    @classmethod
    def _valid_type(cls, v):
        if v not in SESSION_TYPES:
            raise ValueError(f"session_type must be one of: {', '.join(SESSION_TYPES)}")
        return v


class ConsultationUpdate(BaseModel):
    """Staff action: confirm/complete/cancel and (optionally) set the scheduled
    time and notes. Assigning advisor happens automatically on confirm."""
    status: str | None = None
    scheduled_at: datetime | None = None
    notes: str | None = None

    @field_validator("status")
    @classmethod
    def _valid_status(cls, v):
        if v is not None and v not in CONSULTATION_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(CONSULTATION_STATUSES)}")
        return v


class ConsultationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    candidate_id: uuid.UUID
    advisor_id: uuid.UUID | None
    session_type: str
    status: str
    topic: str | None
    requested_time: datetime | None
    scheduled_at: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    # enriched
    candidate_name: str | None = None
    advisor_name: str | None = None
