export const API_ENDPOINTS = {
    AUTH: {
      REGISTER: "/auth/register",
      LOGIN: "/auth/login",
      REFRESH: "/auth/refresh",
      LOGOUT: "/auth/logout",
      ME: "/auth/me",
      FORGOT_PASSWORD: "/auth/password-reset/request",
      RESET_PASSWORD: "/auth/password-reset/confirm",
    },

    CANDIDATE: {
      ME: "/candidates/me",
      SKILLS: "/candidates/me/skills",
      SKILL: (skillId: string) => `/candidates/me/skills/${skillId}`,
      EDUCATION: "/candidates/me/education",
      EDUCATION_ITEM: (educationId: string) => `/candidates/me/education/${educationId}`,
      EXPERIENCE: "/candidates/me/experience",
      EXPERIENCE_ITEM: (experienceId: string) => `/candidates/me/experience/${experienceId}`,
      EXPERIENCE_RECALCULATE: "/candidates/me/experience/recalculate",
      LIST: "/candidates",
      DETAIL: (candidateId: string) => `/candidates/${candidateId}`,
    },

    RESUME: {
      UPLOAD: "/resumes/upload",
      LIST: "/resumes",
      DETAIL: (resumeId: string) => `/resumes/${resumeId}`,
      DOWNLOAD: (resumeId: string) => `/resumes/${resumeId}/download`,
      REPARSE: (resumeId: string) => `/resumes/${resumeId}/reparse`,
    },

    ADMIN: {
      USERS: "/admin/users",
      USER_ROLE: (userId: string) => `/admin/users/${userId}/role`,
      USER_ACTIVATE: (userId: string) => `/admin/users/${userId}/activate`,
      USER_DEACTIVATE: (userId: string) => `/admin/users/${userId}/deactivate`,
    },

    SUPER_ADMIN: {
      ADMINS: "/super-admin/admins",
      ADMIN_ROLE: (userId: string) => `/super-admin/admins/${userId}/role`,
      ADMIN_ACTIVATE: (userId: string) => `/super-admin/admins/${userId}/activate`,
      ADMIN_DEACTIVATE: (userId: string) => `/super-admin/admins/${userId}/deactivate`,
    },

    BENCHMARK: {
      LIST: "/benchmarks",
      DETAIL: (benchmarkId: string) => `/benchmarks/${benchmarkId}`,
    },

    MATCHING: {
      ME: "/matching/me",
      ME_COMPUTE: "/matching/me/compute",
      CANDIDATE: (candidateId: string) => `/matching/candidates/${candidateId}`,
      CANDIDATE_COMPUTE: (candidateId: string) => `/matching/candidates/${candidateId}/compute`,
    },

    CAREER: {
      ME: "/career/me",
      ME_GENERATE: "/career/me/generate",
      CANDIDATE: (candidateId: string) => `/career/candidates/${candidateId}`,
      CANDIDATE_GENERATE: (candidateId: string) => `/career/candidates/${candidateId}/generate`,
    },
  };