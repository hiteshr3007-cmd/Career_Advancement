import { AdminUser } from "./admin";

// Admin-tier roles a super admin manages. Matches the backend's ADMIN_TIER_ROLES
// (schemas/auth.py) — administrator and super_admin only.
export const ADMIN_TIER_ROLES = ["administrator", "super_admin"] as const;
export type AdminTierRole = (typeof ADMIN_TIER_ROLES)[number];

export type AdminAccount = AdminUser;

export interface SuperAdminUserCreateInput {
  email: string;
  password: string;
  full_name: string;
  role: AdminTierRole;
}

export interface SuperAdminRoleUpdateInput {
  role: AdminTierRole;
}
