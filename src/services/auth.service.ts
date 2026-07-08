import { API_ENDPOINTS } from "../constants/api";
import api from "../lib/api";
import {
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
} from "../types/auth";

const authService = {
    register: async (data: RegisterRequest): Promise<AuthResponse> => {
        const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, data);
        return response.data;
    },

    login: async (data: LoginRequest): Promise<AuthResponse> => {
        const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, data);
        return response.data;
    },

    forgotPassword: async (data: ForgotPasswordRequest) => {
        const response = await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data);
        return response.data;
    },
};

export default authService;