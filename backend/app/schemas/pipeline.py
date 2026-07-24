import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.pipeline import (
    INTERVIEW_MODES,
    INTERVIEW_OUTCOMES,
    INTERVIEW_STATUSES,
    PIPELINE_STAGES,
)


class PipelineEntryCreate(BaseModel):
    job_id: uuid.UUID
    candidate_id: uuid.UUID


class PipelineStageUpdate(BaseModel):
    stage: str

    @field_validator("stage")
    @classmethod
    def stage_must_be_known(cls, value: str) -> str:
        if value not in PIPELINE_STAGES:
            raise ValueError(f"stage must be one of: {', '.join(PIPELINE_STAGES)}")
        return value


class PipelineNoteCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class PipelineNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    author_id: uuid.UUID | None
    author_name: str | None = None
    body: str
    created_at: datetime


# --- Interviews ---
class InterviewCreate(BaseModel):
    scheduled_at: datetime | None = None
    mode: str | None = None
    feedback: str | None = None

    @field_validator("mode")
    @classmethod
    def _valid_mode(cls, v):
        if v is not None and v not in INTERVIEW_MODES:
            raise ValueError(f"mode must be one of: {', '.join(INTERVIEW_MODES)}")
        return v


class InterviewUpdate(BaseModel):
    scheduled_at: datetime | None = None
    mode: str | None = None
    status: str | None = None
    outcome: str | None = None
    feedback: str | None = None

    @field_validator("mode")
    @classmethod
    def _valid_mode(cls, v):
        if v is not None and v not in INTERVIEW_MODES:
            raise ValueError(f"mode must be one of: {', '.join(INTERVIEW_MODES)}")
        return v

    @field_validator("status")
    @classmethod
    def _valid_status(cls, v):
        if v is not None and v not in INTERVIEW_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(INTERVIEW_STATUSES)}")
        return v

    @field_validator("outcome")
    @classmethod
    def _valid_outcome(cls, v):
        if v is not None and v not in INTERVIEW_OUTCOMES:
            raise ValueError(f"outcome must be one of: {', '.join(INTERVIEW_OUTCOMES)}")
        return v


class InterviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    pipeline_entry_id: uuid.UUID
    scheduled_at: datetime | None
    mode: str | None
    status: str
    outcome: str | None
    feedback: str | None
    created_at: datetime


class PipelineEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_id: uuid.UUID
    candidate_id: uuid.UUID
    stage: str
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    # enriched (not persisted on the row)
    job_title: str | None = None
    candidate_name: str | None = None
    candidate_email: str | None = None
    candidate_headline: str | None = None
    created_by_name: str | None = None
    note_count: int = 0
    interview_count: int = 0


class PipelineEntryDetailOut(PipelineEntryOut):
    notes: list[PipelineNoteOut] = Field(default_factory=list)
    interviews: list[InterviewOut] = Field(default_factory=list)
