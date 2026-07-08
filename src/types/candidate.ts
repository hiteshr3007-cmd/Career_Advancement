export interface CreateCandidateRequest {
    firstName: string;
    lastName: string;
    phone: string;
    location: string;
  }

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
