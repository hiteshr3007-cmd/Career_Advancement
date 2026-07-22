import uuid
from datetime import datetime

from pydantic import BaseModel


class SkillScore(BaseModel):
    name: str
    proficiency: str | None = None
    manual_score: int | None = None       # user self-rating, 1-5
    in_resume: bool                        # skill parsed from the resume
    in_project: bool                       # skill name appears in a project
    score: int                             # 0-100, model-computed


class ScorecardMetric(BaseModel):
    metric: str
    current: float
    target: float
    unit: str                              # "score" | "count"
    status: str                            # Good | Medium | Improve | Critical


class ScorecardOut(BaseModel):
    candidate_id: uuid.UUID
    employability_score: int
    technical_skills_score: int
    resume_score: int
    projects_count: int
    certifications_count: int
    benchmark_readiness: float | None      # best readiness across computed matches, if any
    metrics: list[ScorecardMetric]
    skill_scores: list[SkillScore]
    generated_at: datetime
