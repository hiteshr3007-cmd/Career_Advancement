from pydantic import BaseModel


class OverviewOut(BaseModel):
    candidates: int
    jobs_total: int
    jobs_open: int
    applications_total: int
    hires: int
    enrollments_total: int
    consultations_open: int
    avg_profile_completeness: float


class PipelineFunnelOut(BaseModel):
    stage_counts: dict[str, int]
    total: int
    hires: int
    rejected: int


class SkillCount(BaseModel):
    name: str
    count: int


class SkillGap(BaseModel):
    name: str
    demand: int
    supply: int
    gap: int


class SkillAnalyticsOut(BaseModel):
    supply: list[SkillCount]
    demand: list[SkillCount]
    top_gaps: list[SkillGap]
