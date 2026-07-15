import api from "../lib/api";
import { API_ENDPOINTS } from "../constants/api";
import { MatchResult } from "../types/matching";

const matchingService = {
  getMyMatches: async (): Promise<MatchResult[]> => {
    const response = await api.get<MatchResult[]>(API_ENDPOINTS.MATCHING.ME);
    return response.data;
  },

  // Omit benchmarkId to compute against every active benchmark in the
  // candidate's industry (backend default); pass it to target just one.
  computeMyMatches: async (benchmarkId?: string): Promise<MatchResult[]> => {
    const response = await api.post<MatchResult[]>(API_ENDPOINTS.MATCHING.ME_COMPUTE, null, {
      params: benchmarkId ? { benchmark_id: benchmarkId } : undefined,
    });
    return response.data;
  },

  // Recruiter/HR reviewer/employer/admin view of a specific candidate's matches.
  getCandidateMatches: async (candidateId: string): Promise<MatchResult[]> => {
    const response = await api.get<MatchResult[]>(API_ENDPOINTS.MATCHING.CANDIDATE(candidateId));
    return response.data;
  },

  computeCandidateMatches: async (candidateId: string, benchmarkId?: string): Promise<MatchResult[]> => {
    const response = await api.post<MatchResult[]>(
      API_ENDPOINTS.MATCHING.CANDIDATE_COMPUTE(candidateId),
      null,
      { params: benchmarkId ? { benchmark_id: benchmarkId } : undefined }
    );
    return response.data;
  },
};

export default matchingService;
