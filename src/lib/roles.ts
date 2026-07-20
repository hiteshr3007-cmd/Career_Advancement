// AuthUser.role is already display-formatted by auth-context.tsx's formatRole()
// (e.g. "hr_reviewer" -> "Hr reviewer"), so these constants match that casing.
// Backend roles (models/user.py): candidate | recruiter | hr_reviewer | employer | administrator.
export const CANDIDATE_ROLE = "Candidate";
export const ADMINISTRATOR_ROLE = "Administrator";
// formatRole() turns "super_admin" -> "Super admin".
export const SUPER_ADMIN_ROLE = "Super admin";
export const VIEWER_ROLES = ["Recruiter", "Hr reviewer", "Employer", "Administrator"];

export function isCandidate(role?: string): boolean {
  return role === CANDIDATE_ROLE;
}

export function isViewerRole(role?: string): boolean {
  return !!role && VIEWER_ROLES.includes(role);
}

export function isAdmin(role?: string): boolean {
  return role === ADMINISTRATOR_ROLE;
}

export function isSuperAdmin(role?: string): boolean {
  return role === SUPER_ADMIN_ROLE;
}
