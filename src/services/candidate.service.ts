import api from "../lib/api";
import { API_ENDPOINTS } from "../constants/api";
import {
  CreateCandidateRequest,
  CandidateProfile,
} from "../types/candidate";

const candidateService = {
    createCandidate: async (data: CreateCandidateRequest) => {
        const response = await api.post(API_ENDPOINTS.CANDIDATE.CREATE, data);
        return response.data;
    },

    getMyProfile: async (): Promise<CandidateProfile> => {
        const response = await api.get(API_ENDPOINTS.CANDIDATE.ME);
        return response.data;
    },
    
};

export default candidateService;