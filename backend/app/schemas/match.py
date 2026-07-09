import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MatchResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    candidate_id: uuid.UUID
    benchmark_id: uuid.UUID
    match_score: float
    readiness_score: float
    semantic_similarity: float
    matched_required_skills: list
    missing_required_skills: list
    matched_preferred_skills: list
    missing_certifications: list
    experience_gap_years: float
    gap_summary: dict
    computed_at: datetime


class BenchmarkMatchSummary(BaseModel):
    benchmark_id: uuid.UUID
    benchmark_name: str
    match_score: float
    readiness_score: float
