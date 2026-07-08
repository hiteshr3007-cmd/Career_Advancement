"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { STORAGE_KEYS } from "@/constants/storage";
import authService from "@/services/auth.service";
import { AuthUser, LoginRequest, RegisterRequest } from "@/types/auth";

// Backend isn't live yet (api.ts baseURL is still a placeholder). Flip this
// to false once real auth endpoints are wired up.
const MOCK_AUTH = false;

function buildMockUser(email: string, fullName?: string): AuthUser {
  return {
    id: "mock-user-1",
    full_name: fullName ?? email.split("@")[0],
    email,
    role: "Candidate",
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<{ autoLoggedIn: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

    if (token) {
      setHasToken(true);

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem(STORAGE_KEYS.USER);
        }
      }
    }

    setIsLoading(false);
  }, []);

  const persistSession = (token: string, sessionUser: AuthUser | null) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    if (sessionUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(sessionUser));
    }
    setHasToken(true);
    setUser(sessionUser);
  };

  const login = useCallback(async (data: LoginRequest) => {
    if (MOCK_AUTH) {
      persistSession("mock-token", buildMockUser(data.email));
      return;
    }

    const response = await authService.login(data);
    const token = response.access_token ?? response.token;

    if (!token) {
      throw new Error("Login response did not include an access token.");
    }

    persistSession(token, response.user ?? null);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    if (MOCK_AUTH) {
      persistSession("mock-token", buildMockUser(data.email, data.full_name));
      return { autoLoggedIn: true };
    }

    const response = await authService.register(data);
    const token = response.access_token ?? response.token;

    if (token) {
      persistSession(token, response.user ?? null);
      return { autoLoggedIn: true };
    }

    return { autoLoggedIn: false };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setHasToken(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: hasToken,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
