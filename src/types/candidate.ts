// ---- Raw backend shapes (schemas/candidate.py: CandidateProfileOut) ----

export interface SkillOut {
    id: string;
    name: string;
    proficiency?: string | null;
    category?: string | null;
    manual_score?: number | null;
    source: string;
  }

  export interface EducationOut {
    id: string;
    degree?: string | null;
    field_of_study?: string | null;
    institution?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    grade?: string | null;
  }

  export interface ExperienceOut {
    id: string;
    title?: string | null;
    company?: string | null;
    industry?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    is_current: boolean;
    description?: string | null;
  }

  export interface CandidateProfileOut {
    id: string;
    user_id: string;
    phone?: string | null;
    location?: string | null;
    summary?: string | null;
    current_designation?: string | null;
    experience_level?: string | null;
    total_experience_years?: number | null;
    experience_years_manual_override: boolean;
    industry?: string | null;
    functional_area?: string | null;
    career_stage?: string | null;
    certifications: string[];
    projects: unknown[];
    achievements: unknown[];
    keywords: string[];
    career_preferences: Record<string, unknown>;
    profile_completeness: number;
    created_at: string;
    updated_at: string;
    skills: SkillOut[];
    education: EducationOut[];
    experiences: ExperienceOut[];
  }

// ---- Input shapes for editing (schemas/candidate.py: *Update / *In) ----

export interface CandidateProfileUpdateInput {
  phone?: string | null;
  location?: string | null;
  summary?: string | null;
  current_designation?: string | null;
  experience_level?: string | null;
  total_experience_years?: number | null;
  industry?: string | null;
  functional_area?: string | null;
  career_stage?: string | null;
}

export interface SkillInput {
  name: string;
  proficiency?: string | null;
  category?: string | null;
}

export interface EducationInput {
  degree?: string | null;
  field_of_study?: string | null;
  institution?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  grade?: string | null;
}

export interface ExperienceInput {
  title?: string | null;
  company?: string | null;
  industry?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
}

// ---- Recruiter/HR/employer-facing candidate search (schemas/candidate.py: CandidateSearchResultOut) ----

export interface CandidateSearchResult extends CandidateProfileOut {
  full_name: string;
  email: string;
}

export interface CandidateSearchFilters {
  industry?: string;
  functional_area?: string;
  experience_level?: string;
  min_experience_years?: number;
  max_experience_years?: number;
  skill?: string;
  limit?: number;
  offset?: number;
}

export interface CandidateSearchPage {
  items: CandidateSearchResult[];
  total: number;
  limit: number;
  offset: number;
}