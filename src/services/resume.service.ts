import api from "../lib/api";
import { API_ENDPOINTS } from "../constants/api";
import { UploadResumeResponse } from "../types/resume";

const resumeService = {
    uploadResume: async (file: File): Promise<UploadResumeResponse> => {
        const formData = new FormData();
        formData.append("file", file);

        // Let the browser set the multipart boundary; overriding Content-Type
        // here would drop it. We only need to clear the axios JSON default.
        const response = await api.post(API_ENDPOINTS.RESUME.UPLOAD, formData, {
            headers: { "Content-Type": undefined },
        });

        return response.data;
    },
};

export default resumeService;