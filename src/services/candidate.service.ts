import api from "../lib/api";
import { API_ENDPOINTS } from "../constants/api";
import {
  CandidateProfileOut,
  CandidateProfileUpdateInput,
  CandidateSearchFilters,
  CandidateSearchPage,
  CandidateSearchResult,
  EducationInput,
  EducationOut,
  ExperienceInput,
  ExperienceOut,
  SkillInput,
  SkillOut,
} from "../types/candidate";

const candidateService = {
  getMyProfile: async (): Promise<CandidateProfileOut> => {
    const response = await api.get<CandidateProfileOut>(API_ENDPOINTS.CANDIDATE.ME);
    return response.data;
  },

  updateProfile: async (
    payload: CandidateProfileUpdateInput
  ): Promise<CandidateProfileOut> => {
    const response = await api.put<CandidateProfileOut>(
      API_ENDPOINTS.CANDIDATE.ME,
      payload
    );
    return response.data;
  },

  addSkill: async (payload: SkillInput): Promise<SkillOut> => {
    const response = await api.post<SkillOut>(API_ENDPOINTS.CANDIDATE.SKILLS, payload);
    return response.data;
  },

  deleteSkill: async (skillId: string): Promise<void> => {
    await api.delete(API_ENDPOINTS.CANDIDATE.SKILL(skillId));
  },

  addEducation: async (payload: EducationInput): Promise<EducationOut> => {
    const response = await api.post<EducationOut>(
      API_ENDPOINTS.CANDIDATE.EDUCATION,
      payload
    );
    return response.data;
  },

  deleteEducation: async (educationId: string): Promise<void> => {
    await api.delete(API_ENDPOINTS.CANDIDATE.EDUCATION_ITEM(educationId));
  },

  addExperience: async (payload: ExperienceInput): Promise<ExperienceOut> => {
    const response = await api.post<ExperienceOut>(
      API_ENDPOINTS.CANDIDATE.EXPERIENCE,
      payload
    );
    return response.data;
  },

  // Clears a manual total_experience_years override and re-derives it from
  // the candidate's experience entries; returns the updated profile.
  recalculateExperienceYears: async (): Promise<CandidateProfileOut> => {
    const response = await api.post<CandidateProfileOut>(
      API_ENDPOINTS.CANDIDATE.EXPERIENCE_RECALCULATE
    );
    return response.data;
  },

  deleteExperience: async (experienceId: string): Promise<void> => {
    await api.delete(API_ENDPOINTS.CANDIDATE.EXPERIENCE_ITEM(experienceId));
  },

  searchCandidates: async (
    filters: CandidateSearchFilters
  ): Promise<CandidateSearchPage> => {
    const response = await api.get<CandidateSearchPage>(API_ENDPOINTS.CANDIDATE.LIST, {
      params: filters,
    });
    return response.data;
  },

  getCandidateById: async (candidateId: string): Promise<CandidateSearchResult> => {
    const response = await api.get<CandidateSearchResult>(
      API_ENDPOINTS.CANDIDATE.DETAIL(candidateId)
    );
    return response.data;
  },
};

export default candidateService;
