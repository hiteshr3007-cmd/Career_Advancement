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
    },

    RESUME: {
      UPLOAD: "/resumes/upload",
      LIST: "/resumes",
    },
  };