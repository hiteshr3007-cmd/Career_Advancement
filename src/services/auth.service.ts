import { API_ENDPOINTS } from "../constants/api";
import api from "../lib/api";
import { LoginRequest, RegisterRequest } from "../types/auth";

const authService = {
    register: async (data: RegisterRequest) => {
        const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, data);
        return response.data;
    },
    
    login: async (data: LoginRequest) => {
        const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, data);
        return response.data;
    },  
};

export default authService;