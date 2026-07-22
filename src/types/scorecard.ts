// Matches backend/app/schemas/scorecard.py — computed on demand, no stored row.

export type MetricStatus = "Good" | "Medium" | "Improve" | "Critical";

export interface ScorecardMetric {
  metric: string;
  current: number;
  target: number;
  unit: string;
  status: MetricStatus;
}

export interface SkillScore {
  name: string;
  proficiency?: string | null;
  manual_score?: number | null;
  in_resume: boolean;
  in_project: boolean;
  score: number; // 0-100
}

export interface ScorecardOut {
  candidate_id: string;
  employability_score: number;
  technical_skills_score: number;
  resume_score: number;
  projects_count: number;
  certifications_count: number;
  benchmark_readiness: number | null;
  metrics: ScorecardMetric[];
  skill_scores: SkillScore[];
  generated_at: string;
}
