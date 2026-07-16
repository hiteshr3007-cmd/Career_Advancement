import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CareerPlanStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    candidate_id: uuid.UUID
    status: str  # pending | processing | completed | failed
    error: str | None
    llm_used: bool
    generated_at: datetime | None


class CareerPlanOut(CareerPlanStatusOut):
    """Full plan. gap_report/recommendations/roadmap are the persisted
    phase3 Pydantic dumps (DetailedGapReport / RecommendationSet /
    CareerRoadmap) — see phase3/schemas.py for their structure."""

    gap_report: dict | None
    recommendations: dict | None
    roadmap: dict | None
    notes: list
