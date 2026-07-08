import api from "../lib/api";
import { API_ENDPOINTS } from "../constants/api";
import { UploadResumeResponse } from "../types/resume";

const resumeService = {
    uploadResume: async (file: File): Promise<UploadResumeResponse> => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await api.post(API_ENDPOINTS.RESUME.UPLOAD, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        return response.data;
    },
};

export default resumeService;
