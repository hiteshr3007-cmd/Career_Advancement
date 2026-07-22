import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class SkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    proficiency: str | None = None
    category: str | None = None
    source: str
    manual_score: int | None = None  # user self-rating, 1-5


class SkillIn(BaseModel):
    name: str
    proficiency: str | None = None
    category: str | None = None
    manual_score: int | None = Field(default=None, ge=1, le=5)


class SkillUpdate(BaseModel):
    """Partial update for an existing skill (e.g. set the manual 1-5 score)."""
    proficiency: str | None = None
    category: str | None = None
    manual_score: int | None = Field(default=None, ge=1, le=5)


class EducationIn(BaseModel):
    degree: str | None = None
    field_of_study: str | None = None
    institution: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    grade: str | None = None


class EducationOut(EducationIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID


class ExperienceIn(BaseModel):
    title: str | None = None
    company: str | None = None
    industry: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_current: bool = False
    description: str | None = None


class ExperienceOut(ExperienceIn):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID


class CareerPreferences(BaseModel):
    desired_roles: list[str] = Field(default_factory=list)
    desired_locations: list[str] = Field(default_factory=list)
    desired_industries: list[str] = Field(default_factory=list)
    min_expected_salary: float | None = None
    remote_preference: str | None = None  # remote/hybrid/onsite


class CandidateProfileUpdate(BaseModel):
    phone: str | None = None
    location: str | None = None
    summary: str | None = None
    current_designation: str | None = None
    experience_level: str | None = None
    total_experience_years: float | None = None
    industry: str | None = None
    functional_area: str | None = None
    career_stage: str | None = None
    career_preferences: CareerPreferences | None = None


class CandidateProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    phone: str | None
    location: str | None
    summary: str | None
    current_designation: str | None
    experience_level: str | None
    total_experience_years: float | None
    experience_years_manual_override: bool
    industry: str | None
    functional_area: str | None
    career_stage: str | None
    certifications: list
    projects: list
    achievements: list
    keywords: list
    career_preferences: dict
    profile_completeness: float
    created_at: datetime
    updated_at: datetime
    skills: list[SkillOut] = Field(default_factory=list)
    education: list[EducationOut] = Field(default_factory=list)
    experiences: list[ExperienceOut] = Field(default_factory=list)


class CandidateSearchResultOut(CandidateProfileOut):
    """CandidateProfileOut plus the account fields recruiters/HR/employers need
    to identify a candidate (name/email live on the User model, not the profile).
    """

    full_name: str
    # Plain str, not EmailStr — response model echoing a stored address; avoids
    # one bad row 500-ing the directory. See UserOut in schemas/auth.py.
    email: str


class CandidateSearchFilters(BaseModel):
    industry: str | None = None
    functional_area: str | None = None
    experience_level: str | None = None
    min_experience_years: float | None = None
    max_experience_years: float | None = None
    skill: str | None = None


class CandidateSearchPage(BaseModel):
    """Paginated envelope returned by the candidate search endpoint."""
    items: list[CandidateSearchResultOut]
    total: int
    limit: int
    offset: int
