import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.job import (
    DEFAULT_JOB_STATUS,
    EMPLOYMENT_TYPES,
    JOB_STATUSES,
    REMOTE_OPTIONS,
)


# --- Employer profile ---
class EmployerProfileUpdate(BaseModel):
    company_name: str | None = None
    website: str | None = None
    industry: str | None = None
    company_size: str | None = None
    location: str | None = None
    description: str | None = None


class EmployerProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    company_name: str | None
    website: str | None
    industry: str | None
    company_size: str | None
    location: str | None
    description: str | None
    created_at: datetime
    updated_at: datetime


# --- Jobs ---
class JobBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    industry: str | None = None
    functional_area: str | None = None
    location: str | None = None
    employment_type: str | None = None
    remote_option: str | None = None
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    required_certifications: list[str] = Field(default_factory=list)
    min_experience_years: float = 0
    max_experience_years: float | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    openings: int = Field(default=1, ge=1)

    @field_validator("employment_type")
    @classmethod
    def _valid_employment(cls, v):
        if v is not None and v not in EMPLOYMENT_TYPES:
            raise ValueError(f"employment_type must be one of: {', '.join(EMPLOYMENT_TYPES)}")
        return v

    @field_validator("remote_option")
    @classmethod
    def _valid_remote(cls, v):
        if v is not None and v not in REMOTE_OPTIONS:
            raise ValueError(f"remote_option must be one of: {', '.join(REMOTE_OPTIONS)}")
        return v


class JobCreate(JobBase):
    status: str = DEFAULT_JOB_STATUS

    @field_validator("status")
    @classmethod
    def _valid_status(cls, v):
        if v not in JOB_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(JOB_STATUSES)}")
        return v


class JobUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    industry: str | None = None
    functional_area: str | None = None
    location: str | None = None
    employment_type: str | None = None
    remote_option: str | None = None
    required_skills: list[str] | None = None
    preferred_skills: list[str] | None = None
    required_certifications: list[str] | None = None
    min_experience_years: float | None = None
    max_experience_years: float | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    openings: int | None = Field(default=None, ge=1)
    status: str | None = None

    @field_validator("status")
    @classmethod
    def _valid_status(cls, v):
        if v is not None and v not in JOB_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(JOB_STATUSES)}")
        return v


class JobStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def _valid_status(cls, v):
        if v not in JOB_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(JOB_STATUSES)}")
        return v


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    employer_id: uuid.UUID | None
    title: str
    description: str | None
    industry: str | None
    functional_area: str | None
    location: str | None
    employment_type: str | None
    remote_option: str | None
    required_skills: list
    preferred_skills: list
    required_certifications: list
    min_experience_years: float
    max_experience_years: float | None
    salary_min: float | None
    salary_max: float | None
    openings: int
    status: str
    created_at: datetime
    updated_at: datetime
    # enriched (not persisted)
    employer_name: str | None = None
    company_name: str | None = None
    application_count: int | None = None


class JobSearchPage(BaseModel):
    items: list[JobOut]
    total: int
    limit: int
    offset: int


# --- Job matching results ---
class MatchScoreFields(BaseModel):
    match_score: float
    readiness_score: float
    matched_required_skills: list[str] = Field(default_factory=list)
    missing_required_skills: list[str] = Field(default_factory=list)
    matched_preferred_skills: list[str] = Field(default_factory=list)
    missing_certifications: list[str] = Field(default_factory=list)
    experience_gap_years: float = 0.0
    recommendation: str = "developing"


class RecommendedJobOut(MatchScoreFields):
    job: JobOut


class RecommendedCandidateOut(MatchScoreFields):
    candidate_id: uuid.UUID
    full_name: str | None = None
    email: str | None = None
    current_designation: str | None = None
    total_experience_years: float | None = None
