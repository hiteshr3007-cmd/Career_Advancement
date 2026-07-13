"""DB-free Pydantic contracts for Phase 3.

INPUTS mirror exactly what Phase 2 already produces so integration is a direct
mapping:
  - CandidateSnapshot  <- CandidateProfile (+ its skills/education/experience)
  - BenchmarkMatchInput <- CandidateBenchmarkMatch (+ its Benchmark)
    including the `gap_summary` dict emitted by app/services/matching/engine.py

OUTPUTS are the three Phase 3 deliverables:
  - DetailedGapReport   (Module 7)
  - RecommendationSet   (Module 8)
  - CareerRoadmap       (Module 9)
"""
from __future__ import annotations

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
# INPUTS
# --------------------------------------------------------------------------- #
class ExperienceSnapshot(BaseModel):
    title: str | None = None
    company: str | None = None
    description: str | None = None
    is_current: bool = False


class EducationSnapshot(BaseModel):
    degree: str | None = None
    field_of_study: str | None = None
    institution: str | None = None


class CandidateSnapshot(BaseModel):
    """Plain projection of a candidate profile — no DB objects."""
    full_name: str | None = None
    current_designation: str | None = None
    industry: str | None = None
    functional_area: str | None = None
    experience_level: str | None = None
    total_experience_years: float = 0.0
    summary: str | None = None
    skills: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    experiences: list[ExperienceSnapshot] = Field(default_factory=list)
    education: list[EducationSnapshot] = Field(default_factory=list)


class SkillGap(BaseModel):
    missing_required: list[str] = Field(default_factory=list)
    missing_preferred: list[str] = Field(default_factory=list)
    required_match_ratio: float = 0.0


class CertificationGap(BaseModel):
    missing: list[str] = Field(default_factory=list)
    match_ratio: float = 0.0


class ExperienceGap(BaseModel):
    years_short: float = 0.0
    candidate_years: float = 0.0
    benchmark_min_years: float = 0.0


class GapSummary(BaseModel):
    """Exactly the shape of CandidateBenchmarkMatch.gap_summary from Phase 2."""
    skill_gap: SkillGap = Field(default_factory=SkillGap)
    certification_gap: CertificationGap = Field(default_factory=CertificationGap)
    experience_gap: ExperienceGap = Field(default_factory=ExperienceGap)
    overall_recommendation: str = "not_ready"  # ready | developing | not_ready


class BenchmarkMatchInput(BaseModel):
    """One computed candidate-vs-benchmark match (from Phase 2)."""
    benchmark_name: str
    benchmark_level: str | None = None
    benchmark_category: str | None = None
    match_score: float = 0.0
    readiness_score: float = 0.0
    gap_summary: GapSummary = Field(default_factory=GapSummary)


# --------------------------------------------------------------------------- #
# MODULE 7 — Gap Analysis output
# --------------------------------------------------------------------------- #
class PrioritizedSkillGap(BaseModel):
    skill: str
    kind: str                       # "required" | "preferred"
    needed_by_benchmarks: list[str] = Field(default_factory=list)
    priority: float = 0.0           # 0..1, higher = more urgent
    priority_band: str = "medium"   # high | medium | low


class ResumeIssue(BaseModel):
    type: str                       # ats_missing_keywords | weak_achievement | missing_quantification | ...
    severity: str                   # high | medium | low
    detail: str
    suggestion: str


class DetailedGapReport(BaseModel):
    overall_readiness_score: float = 0.0
    overall_recommendation: str = "not_ready"
    target_benchmarks: list[str] = Field(default_factory=list)
    skill_gaps: list[PrioritizedSkillGap] = Field(default_factory=list)
    missing_certifications: list[str] = Field(default_factory=list)
    experience_gap_years: float = 0.0
    resume_issues: list[ResumeIssue] = Field(default_factory=list)
    narrative: str | None = None    # optional LLM-generated summary


# --------------------------------------------------------------------------- #
# MODULE 8 — Recommendation output
# --------------------------------------------------------------------------- #
class LearningRecommendation(BaseModel):
    skill: str
    title: str
    provider: str
    resource_type: str              # course | certification | practice | reading
    url: str | None = None
    rationale: str | None = None


class ResumeImprovement(BaseModel):
    issue_type: str
    recommendation: str


class RecommendationSet(BaseModel):
    learning: list[LearningRecommendation] = Field(default_factory=list)
    certifications: list[LearningRecommendation] = Field(default_factory=list)
    resume_improvements: list[ResumeImprovement] = Field(default_factory=list)
    career_development: list[str] = Field(default_factory=list)
    narrative: str | None = None


# --------------------------------------------------------------------------- #
# MODULE 9 — Career Roadmap output
# --------------------------------------------------------------------------- #
class RoadmapAction(BaseModel):
    action: str
    focus_area: str                 # skill | certification | resume | experience | networking
    detail: str | None = None


class RoadmapPhase(BaseModel):
    horizon: str                    # "30-day" | "90-day" | "180-day" | "12-month"
    goal: str
    actions: list[RoadmapAction] = Field(default_factory=list)


class CareerRoadmap(BaseModel):
    target_role: str | None = None
    summary: str | None = None
    phases: list[RoadmapPhase] = Field(default_factory=list)
    generated_by: str = "deterministic"   # "deterministic" | "llm:<model>"


# --------------------------------------------------------------------------- #
# Combined Phase 3 result (what run_phase3 returns / a future endpoint serves)
# --------------------------------------------------------------------------- #
class Phase3Result(BaseModel):
    gap_report: DetailedGapReport
    recommendations: RecommendationSet
    roadmap: CareerRoadmap
    llm_used: bool = False
    notes: list[str] = Field(default_factory=list)
