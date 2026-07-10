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
import { extractApiError } from "@/lib/api";
import {
  AuthUser,
  BackendUser,
  LoginRequest,
  RegisterRequest,
} from "@/types/auth";

// Display-friendly role label ("candidate" -> "Candidate").
function formatRole(role?: string): string | undefined {
  if (!role) return undefined;
  return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ");
}

function toAuthUser(user: BackendUser): AuthUser {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: formatRole(user.role),
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

      // Re-validate the session and refresh the cached user in the background.
      authService
        .getMe()
        .then((me) => {
          const authUser = toAuthUser(me);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authUser));
          setUser(authUser);
        })
        .catch(() => {
          // Interceptor handles token refresh / redirect on hard 401s.
        });
    }

    setIsLoading(false);
  }, []);

  const persistTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    setHasToken(true);
  };

  const persistUser = (authUser: AuthUser) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authUser));
    setUser(authUser);
  };

  const login = useCallback(async (data: LoginRequest) => {
    try {
      const tokens = await authService.login(data);
      persistTokens(tokens.access_token, tokens.refresh_token);

      const me = await authService.getMe();
      persistUser(toAuthUser(me));
    } catch (err) {
      throw new Error(
        extractApiError(
          err,
          "Unable to sign in. Check your credentials and try again."
        )
      );
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    try {
      // Backend register returns no tokens, so log the user in right after.
      await authService.register(data);
      await login({ email: data.email, password: data.password });
      return { autoLoggedIn: true };
    } catch (err) {
      throw new Error(
        extractApiError(
          err,
          "Unable to create your account. Please try again."
        )
      );
    }
  }, [login]);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (refreshToken) {
      // Best-effort server-side revocation; don't block the UI on it.
      authService.logout(refreshToken).catch(() => {});
    }
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
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