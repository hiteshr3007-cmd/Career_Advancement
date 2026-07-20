import api from "../lib/api";
import { API_ENDPOINTS } from "../constants/api";
import {
  AdminAccount,
  SuperAdminRoleUpdateInput,
  SuperAdminUserCreateInput,
} from "../types/superadmin";

const superAdminService = {
  listAdmins: async (role?: string): Promise<AdminAccount[]> => {
    const response = await api.get<AdminAccount[]>(API_ENDPOINTS.SUPER_ADMIN.ADMINS, {
      params: role ? { role } : undefined,
    });
    return response.data;
  },

  createAdmin: async (payload: SuperAdminUserCreateInput): Promise<AdminAccount> => {
    const response = await api.post<AdminAccount>(API_ENDPOINTS.SUPER_ADMIN.ADMINS, payload);
    return response.data;
  },

  updateAdminRole: async (
    userId: string,
    payload: SuperAdminRoleUpdateInput
  ): Promise<AdminAccount> => {
    const response = await api.patch<AdminAccount>(
      API_ENDPOINTS.SUPER_ADMIN.ADMIN_ROLE(userId),
      payload
    );
    return response.data;
  },

  activateAdmin: async (userId: string): Promise<AdminAccount> => {
    const response = await api.patch<AdminAccount>(
      API_ENDPOINTS.SUPER_ADMIN.ADMIN_ACTIVATE(userId)
    );
    return response.data;
  },

  deactivateAdmin: async (userId: string): Promise<AdminAccount> => {
    const response = await api.patch<AdminAccount>(
      API_ENDPOINTS.SUPER_ADMIN.ADMIN_DEACTIVATE(userId)
    );
    return response.data;
  },
};

export default superAdminService;
