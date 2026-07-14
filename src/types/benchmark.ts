// Matches the backend BenchmarkOut (schemas/benchmark.py).
export interface Benchmark {
  id: string;
  name: string;
  category: string;
  functional_area: string | null;
  level: string;
  required_skills: string[];
  preferred_skills: string[];
  required_certifications: string[];
  preferred_certifications: string[];
  min_experience_years: number;
  max_experience_years: number | null;
  career_milestones: string[];
  industry_standards: Record<string, unknown>;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export const BENCHMARK_LEVELS = ["entry", "mid", "senior", "lead", "executive"] as const;
export type BenchmarkLevel = (typeof BENCHMARK_LEVELS)[number];

export interface BenchmarkFilters {
  category?: string;
  level?: string;
  functional_area?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

// Fields exposed in the create/edit form. required/preferred skills and
// certifications are edited as comma-separated text and split on submit.
export interface BenchmarkFormInput {
  name: string;
  category: string;
  functional_area: string;
  level: string;
  min_experience_years: number;
  max_experience_years: number | null;
  required_skills: string[];
  preferred_skills: string[];
  required_certifications: string[];
  preferred_certifications: string[];
  description: string;
}
