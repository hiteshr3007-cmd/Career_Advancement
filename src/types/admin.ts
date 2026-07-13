// Matches the backend UserOut (schemas/auth.py), as returned by the /admin/users* endpoints.
export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
}

// Roles an administrator can assign through the admin UI. Candidates
// self-register and administrators are granted via the backend's email
// allowlist, so those aren't offered here — see backend/app/config.py.
export const ASSIGNABLE_ROLES = ["recruiter", "hr_reviewer", "employer"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export interface AdminUserCreateInput {
  email: string;
  password: string;
  full_name: string;
  role: AssignableRole;
}

export interface AdminRoleUpdateInput {
  role: AssignableRole;
}
