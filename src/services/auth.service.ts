import { API_ENDPOINTS } from "../constants/api";
import api from "../lib/api";
import {
    AuthResponse,
    BackendUser,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
} from "../types/auth";

const authService = {
    // Backend register expects { email, password, full_name, role } and returns
    // a UserOut (no tokens). Role defaults to "candidate" for the portal.
    register: async (data: RegisterRequest): Promise<BackendUser> => {
        const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, {
            email: data.email,
            password: data.password,
            full_name: data.full_name,
            role: data.role ?? "candidate",
        });
        return response.data;
    },

    // Backend login uses OAuth2PasswordRequestForm — it expects a
    // x-www-form-urlencoded body with `username` (the email) and `password`,
    // and returns { access_token, token_type }. The refresh token is set as
    // an httpOnly cookie by the backend, not returned in this body.
    login: async (data: LoginRequest): Promise<AuthResponse> => {
        const form = new URLSearchParams();
        form.append("username", data.email);
        form.append("password", data.password);

        const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, form, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        return response.data;
    },

    getMe: async (): Promise<BackendUser> => {
        const response = await api.get(API_ENDPOINTS.AUTH.ME);
        return response.data;
    },

    // The refresh token travels as an httpOnly cookie, so the browser attaches
    // it automatically — nothing to pass here.
    logout: async (): Promise<void> => {
        await api.post(API_ENDPOINTS.AUTH.LOGOUT);
    },

    forgotPassword: async (data: ForgotPasswordRequest) => {
        const response = await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
            email: data.email,
        });
        return response.data;
    },

    resetPassword: async (data: ResetPasswordRequest) => {
        const response = await api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
            email: data.email,
            code: data.code,
            new_password: data.new_password,
        });
        return response.data;
    },
};

export default authService;