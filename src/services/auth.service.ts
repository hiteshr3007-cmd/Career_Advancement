import { API_ENDPOINTS } from "../constants/api";
import api from "../lib/api";
import {
    AuthResponse,
    BackendUser,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
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
    // and returns { access_token, refresh_token, token_type }.
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

    logout: async (refreshToken: string): Promise<void> => {
        await api.post(API_ENDPOINTS.AUTH.LOGOUT, { refresh_token: refreshToken });
    },

    forgotPassword: async (data: ForgotPasswordRequest) => {
        const response = await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
            email: data.email,
        });
        return response.data;
    },
};

export default authService;