import api from "../lib/api";
import { API_ENDPOINTS } from "../constants/api";
import { NOTIFICATIONS_REFRESH_EVENT } from "../constants/events";
import { CareerPlanOut, CareerPlanStatusOut } from "../types/career";

const careerService = {
  // Throws a 404 axios error if no plan has ever been generated — callers
  // should treat that as "no plan yet" rather than a real failure.
  getMyPlan: async (): Promise<CareerPlanOut> => {
    const response = await api.get<CareerPlanOut>(API_ENDPOINTS.CAREER.ME);
    return response.data;
  },

  generateMyPlan: async (): Promise<CareerPlanStatusOut> => {
    const response = await api.post<CareerPlanStatusOut>(API_ENDPOINTS.CAREER.ME_GENERATE);
    window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
    return response.data;
  },

  // Recruiter/HR reviewer/employer/admin view of a specific candidate's plan.
  getCandidatePlan: async (candidateId: string): Promise<CareerPlanOut> => {
    const response = await api.get<CareerPlanOut>(API_ENDPOINTS.CAREER.CANDIDATE(candidateId));
    return response.data;
  },

  generateCandidatePlan: async (candidateId: string): Promise<CareerPlanStatusOut> => {
    const response = await api.post<CareerPlanStatusOut>(
      API_ENDPOINTS.CAREER.CANDIDATE_GENERATE(candidateId)
    );
    return response.data;
  },
};

export default careerService;
