// ---- View models consumed by the UI (kept stable so pages don't change) ----

export interface EducationEntry {
    institution: string;
    degree: string;
    year?: string;
  }

  export interface ExperienceEntry {
    company: string;
    title: string;
    duration?: string;
    description?: string;
  }

  export interface CandidateProfile {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    summary?: string;
    skills?: string[];
    certifications?: string[];
    education?: EducationEntry[];
    experience?: ExperienceEntry[];
  }

// ---- Raw backend shapes (schemas/candidate.py: CandidateProfileOut) ----

export interface SkillOut {
    id: string;
    name: string;
    proficiency?: string | null;
    category?: string | null;
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