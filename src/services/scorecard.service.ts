import api from "../lib/api";
import { API_ENDPOINTS } from "../constants/api";
import { ScorecardOut } from "../types/scorecard";

const scorecardService = {
  getMyScorecard: async (): Promise<ScorecardOut> => {
    const response = await api.get<ScorecardOut>(API_ENDPOINTS.SCORECARD.ME);
    return response.data;
  },

  // Recruiter/HR reviewer/employer/admin view of a specific candidate's scorecard.
  getCandidateScorecard: async (candidateId: string): Promise<ScorecardOut> => {
    const response = await api.get<ScorecardOut>(
      API_ENDPOINTS.SCORECARD.CANDIDATE(candidateId)
    );
    return response.data;
  },
};

export default scorecardService;
