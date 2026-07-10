// Matches the backend ResumeOut (schemas/resume.py). Parsing runs asynchronously
// on the server, so a freshly uploaded resume comes back as "pending".
export interface UploadResumeResponse {
    id: string;
    candidate_id: string;
    original_file_name: string;
    file_type: string;
    version: number;
    is_active: boolean;
    parsing_status: string;
    parsing_method?: string | null;
    parsing_error?: string | null;
    created_at: string;
}