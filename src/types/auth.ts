export interface RegisterRequest {
    full_name: string;
    email: string;
    password: string;
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

  export interface AuthResponse {
    access_token?: string;
    token?: string;
    user?: AuthUser;
  }