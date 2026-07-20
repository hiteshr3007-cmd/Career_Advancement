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

  export interface ResetPasswordRequest {
    token: string;
    new_password: string;
  }

  export interface AuthUser {
    id: string;
    full_name: string;
    email: string;
    role?: string;
  }

  // Matches the backend AccessTokenResponse (schemas/auth.py). The refresh
  // token never appears here — it's set as an httpOnly cookie the backend
  // manages directly (NEW-2 hardening). Register returns a UserOut instead
  // (no tokens) — see auth.service.ts for how each is handled.
  export interface AuthResponse {
    access_token: string;
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