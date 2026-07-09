import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BenchmarkCreate(BaseModel):
    name: str
    category: str
    functional_area: str | None = None
    level: str
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    required_certifications: list[str] = Field(default_factory=list)
    preferred_certifications: list[str] = Field(default_factory=list)
    min_experience_years: float = 0
    max_experience_years: float | None = None
    career_milestones: list[str] = Field(default_factory=list)
    industry_standards: dict = Field(default_factory=dict)
    description: str | None = None


class BenchmarkUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    functional_area: str | None = None
    level: str | None = None
    required_skills: list[str] | None = None
    preferred_skills: list[str] | None = None
    required_certifications: list[str] | None = None
    preferred_certifications: list[str] | None = None
    min_experience_years: float | None = None
    max_experience_years: float | None = None
    career_milestones: list[str] | None = None
    industry_standards: dict | None = None
    description: str | None = None
    is_active: bool | None = None


class BenchmarkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    category: str
    functional_area: str | None
    level: str
    required_skills: list
    preferred_skills: list
    required_certifications: list
    preferred_certifications: list
    min_experience_years: float
    max_experience_years: float | None
    career_milestones: list
    industry_standards: dict
    description: str | None
    is_active: bool
    created_at: datetime
