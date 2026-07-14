import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

import { API_ENDPOINTS } from "../constants/api";
import { STORAGE_KEYS } from "../constants/storage";

// Base URL of the FastAPI backend (see backend/app/api/v1/router.py — all routes
// are mounted under /api/v1). Override via NEXT_PUBLIC_API_BASE_URL if needed.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Automatic access-token refresh on 401 ---------------------------------
// The backend issues short-lived access tokens (30 min) plus a refresh token.
// When a request fails with 401, transparently exchange the refresh token for a
// new access token (once) and replay the original request. Concurrent 401s
// share a single in-flight refresh call.

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string> | null = null;

function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken =
    typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
      : null;

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  // Bare axios (not `api`) so this call skips the interceptors below.
  const { data } = await axios.post(
    `${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
    { refresh_token: refreshToken },
    { headers: { "Content-Type": "application/json" } }
  );

  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  if (data.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
  }
  return data.access_token as string;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    const isAuthEndpoint =
      typeof original?.url === "string" &&
      (original.url.includes(API_ENDPOINTS.AUTH.LOGIN) ||
        original.url.includes(API_ENDPOINTS.AUTH.REFRESH));

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const newToken = await refreshPromise;
        refreshPromise = null;

        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original as AxiosRequestConfig);
      } catch (refreshError) {
        refreshPromise = null;
        clearSession();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    // A valid session hit a role check it no longer (or never did) satisfy —
    // most commonly a stale client-side role cache after an admin reassigns
    // this user's role mid-session. This is not a session problem, so don't
    // log the user out; just let AuthProvider re-sync the cached role/nav in
    // the background. The rejection below still carries the backend's own
    // `detail` message for whichever page triggered the call to show inline.
    if (status === 403 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:forbidden"));
    }

    return Promise.reject(error);
  }
);

// Turn an axios/network error into a human-readable message. FastAPI returns
// validation/HTTP errors as `{ detail: string | [{ msg, ... }] }`.
export function extractApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Cannot reach the server. Please make sure the backend is running and try again.";
    }
    const detail = (error.response.data as { detail?: unknown } | undefined)
      ?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      if (first?.msg) return first.msg;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default api;