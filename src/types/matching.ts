// Matches the backend MatchResultOut (schemas/match.py).
export interface SkillGap {
  missing_required: string[];
  missing_preferred: string[];
  required_match_ratio: number;
}

export interface CertificationGap {
  missing: string[];
  match_ratio: number;
}

export interface ExperienceGap {
  years_short: number;
  candidate_years: number;
  benchmark_min_years: number;
}

export type MatchRecommendation = "ready" | "developing" | "not_ready";

export interface GapSummary {
  skill_gap: SkillGap;
  certification_gap: CertificationGap;
  experience_gap: ExperienceGap;
  overall_recommendation: MatchRecommendation;
}

export interface MatchResult {
  id: string;
  candidate_id: string;
  benchmark_id: string;
  match_score: number;
  readiness_score: number;
  semantic_similarity: number;
  matched_required_skills: string[];
  missing_required_skills: string[];
  matched_preferred_skills: string[];
  missing_certifications: string[];
  experience_gap_years: number;
  gap_summary: GapSummary;
  computed_at: string;
}
