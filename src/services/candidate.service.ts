import api from "../lib/api";
import { API_ENDPOINTS } from "../constants/api";
import { STORAGE_KEYS } from "../constants/storage";
import {
  CandidateProfile,
  CandidateProfileOut,
  EducationOut,
  ExperienceOut,
} from "../types/candidate";
import { AuthUser } from "../types/auth";

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function yearOf(date?: string | null): string | undefined {
  if (!date) return undefined;
  const year = new Date(date).getFullYear();
  return Number.isNaN(year) ? undefined : String(year);
}

function educationYear(edu: EducationOut): string | undefined {
  return yearOf(edu.end_date) ?? yearOf(edu.start_date);
}

function experienceDuration(exp: ExperienceOut): string | undefined {
  const start = yearOf(exp.start_date);
  const end = exp.is_current ? "Present" : yearOf(exp.end_date);
  if (start && end) return `${start} - ${end}`;
  return start ?? end ?? undefined;
}

// The backend candidate profile carries no name/email (those live on the user
// account), so we merge in the signed-in user for display. Everything else maps
// from CandidateProfileOut into the flat view model the profile page renders.
function mapProfile(data: CandidateProfileOut): CandidateProfile {
  const user = readStoredUser();
  const [firstName, ...rest] = (user?.full_name ?? "").trim().split(/\s+/);

  return {
    id: data.id,
    firstName: firstName ?? "",
    lastName: rest.join(" "),
    email: user?.email ?? "",
    phone: data.phone ?? "",
    location: data.location ?? "",
    summary: data.summary ?? undefined,
    skills: (data.skills ?? []).map((skill) => skill.name),
    certifications: data.certifications ?? [],
    education: (data.education ?? []).map((edu) => ({
      institution: edu.institution ?? "",
      degree: [edu.degree, edu.field_of_study].filter(Boolean).join(", "),
      year: educationYear(edu),
    })),
    experience: (data.experiences ?? []).map((exp) => ({
      company: exp.company ?? "",
      title: exp.title ?? "",
      duration: experienceDuration(exp),
      description: exp.description ?? undefined,
    })),
  };
}

const candidateService = {
    getMyProfile: async (): Promise<CandidateProfile> => {
        const response = await api.get<CandidateProfileOut>(
            API_ENDPOINTS.CANDIDATE.ME
        );
        return mapProfile(response.data);
    },
};

export default candidateService;