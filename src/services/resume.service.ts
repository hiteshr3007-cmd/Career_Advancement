import api from "../lib/api";
import { API_ENDPOINTS } from "../constants/api";
import { Resume } from "../types/resume";

const resumeService = {
    uploadResume: async (file: File): Promise<Resume> => {
        const formData = new FormData();
        formData.append("file", file);

        // Let the browser set the multipart boundary; overriding Content-Type
        // here would drop it. We only need to clear the axios JSON default.
        const response = await api.post(API_ENDPOINTS.RESUME.UPLOAD, formData, {
            headers: { "Content-Type": undefined },
        });

        return response.data;
    },

    listResumes: async (): Promise<Resume[]> => {
        const response = await api.get<Resume[]>(API_ENDPOINTS.RESUME.LIST);
        return response.data;
    },

    downloadResume: async (resumeId: string, fileName: string): Promise<void> => {
        const response = await api.get(API_ENDPOINTS.RESUME.DOWNLOAD(resumeId), {
            responseType: "blob",
        });
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    reparseResume: async (resumeId: string): Promise<Resume> => {
        const response = await api.post<Resume>(API_ENDPOINTS.RESUME.REPARSE(resumeId));
        return response.data;
    },

    deleteResume: async (resumeId: string): Promise<void> => {
        await api.delete(API_ENDPOINTS.RESUME.DETAIL(resumeId));
    },
};

export default resumeService;