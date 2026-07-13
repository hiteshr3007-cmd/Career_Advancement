import api from "../lib/api";
import { API_ENDPOINTS } from "../constants/api";
import {
  AdminRoleUpdateInput,
  AdminUser,
  AdminUserCreateInput,
} from "../types/admin";

const adminService = {
  listUsers: async (role?: string): Promise<AdminUser[]> => {
    const response = await api.get<AdminUser[]>(API_ENDPOINTS.ADMIN.USERS, {
      params: role ? { role } : undefined,
    });
    return response.data;
  },

  createUser: async (payload: AdminUserCreateInput): Promise<AdminUser> => {
    const response = await api.post<AdminUser>(API_ENDPOINTS.ADMIN.USERS, payload);
    return response.data;
  },

  updateUserRole: async (
    userId: string,
    payload: AdminRoleUpdateInput
  ): Promise<AdminUser> => {
    const response = await api.patch<AdminUser>(
      API_ENDPOINTS.ADMIN.USER_ROLE(userId),
      payload
    );
    return response.data;
  },

  activateUser: async (userId: string): Promise<AdminUser> => {
    const response = await api.patch<AdminUser>(
      API_ENDPOINTS.ADMIN.USER_ACTIVATE(userId)
    );
    return response.data;
  },

  deactivateUser: async (userId: string): Promise<AdminUser> => {
    const response = await api.patch<AdminUser>(
      API_ENDPOINTS.ADMIN.USER_DEACTIVATE(userId)
    );
    return response.data;
  },
};

export default adminService;
