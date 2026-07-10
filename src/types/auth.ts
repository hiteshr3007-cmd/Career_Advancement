export interface RegisterRequest {
    full_name: string;
    email: string;
    password: string;
    role?: string;
  }

  export interface LoginRequest {
    email: string;
    password: string;
  }

  export interface ForgotPasswordRequest {
    email: string;
  }

  export interface AuthUser {
    id: string;
    full_name: string;
    email: string;
    role?: string;
  }

  // Matches the backend TokenResponse (schemas/auth.py). Login/refresh return
  // both tokens; register returns a UserOut instead (no tokens) — see
  // auth.service.ts for how each is handled.
  export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    token_type?: string;
  }

  // Matches the backend UserOut (schemas/auth.py) returned by /auth/register
  // and /auth/me.
  export interface BackendUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
    is_verified: boolean;
  }