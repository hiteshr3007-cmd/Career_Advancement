// Matches backend/app/schemas/career_plan.py and backend/phase3/schemas.py.

export type PlanStatus = "pending" | "processing" | "completed" | "failed";

export interface PrioritizedSkillGap {
  skill: string;
  kind: "required" | "preferred";
  needed_by_benchmarks: string[];
  priority: number; // 0..1, higher = more urgent
  priority_band: "high" | "medium" | "low";
}

export interface ResumeIssue {
  type: string; // ats_missing_keywords | weak_achievement | missing_quantification | ...
  severity: "high" | "medium" | "low";
  detail: string;
  suggestion: string;
}

export type OverallRecommendation = "ready" | "developing" | "not_ready";

export interface DetailedGapReport {
  overall_readiness_score: number;
  overall_recommendation: OverallRecommendation;
  target_benchmarks: string[];
  skill_gaps: PrioritizedSkillGap[];
  missing_certifications: string[];
  experience_gap_years: number;
  resume_issues: ResumeIssue[];
  narrative: string | null;
}

export interface LearningRecommendation {
  skill: string;
  title: string;
  provider: string;
  resource_type: "course" | "certification" | "practice" | "reading";
  url: string | null;
  rationale: string | null;
}

export interface ResumeImprovement {
  issue_type: string;
  recommendation: string;
}

export interface RecommendationSet {
  learning: LearningRecommendation[];
  certifications: LearningRecommendation[];
  resume_improvements: ResumeImprovement[];
  career_development: string[];
  narrative: string | null;
}

export type RoadmapHorizon = "30-day" | "90-day" | "180-day" | "12-month";

export interface RoadmapAction {
  action: string;
  focus_area: "skill" | "certification" | "resume" | "experience" | "networking";
  detail: string | null;
}

export interface RoadmapPhase {
  horizon: RoadmapHorizon;
  goal: string;
  actions: RoadmapAction[];
}

export interface CareerRoadmap {
  target_role: string | null;
  summary: string | null;
  phases: RoadmapPhase[];
  generated_by: string; // "deterministic" | "llm:<model>"
}

export interface CareerPlanStatusOut {
  id: string;
  candidate_id: string;
  status: PlanStatus;
  error: string | null;
  llm_used: boolean;
  generated_at: string | null;
}

export interface CareerPlanOut extends CareerPlanStatusOut {
  gap_report: DetailedGapReport | null;
  recommendations: RecommendationSet | null;
  roadmap: CareerRoadmap | null;
  notes: string[];
}
