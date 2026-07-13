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
      LIST: "/candidates",
      DETAIL: (candidateId: string) => `/candidates/${candidateId}`,
    },

    RESUME: {
      UPLOAD: "/resumes/upload",
      LIST: "/resumes",
    },

    ADMIN: {
      USERS: "/admin/users",
      USER_ROLE: (userId: string) => `/admin/users/${userId}/role`,
      USER_ACTIVATE: (userId: string) => `/admin/users/${userId}/activate`,
      USER_DEACTIVATE: (userId: string) => `/admin/users/${userId}/deactivate`,
    },
  };