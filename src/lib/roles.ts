// AuthUser.role is already display-formatted by auth-context.tsx's formatRole()
// (e.g. "hr_reviewer" -> "Hr reviewer"), so these constants match that casing.
export const CANDIDATE_ROLE = "Candidate";
export const VIEWER_ROLES = ["Recruiter", "Hr reviewer", "Employer", "Administrator"];

export function isCandidate(role?: string): boolean {
  return role === CANDIDATE_ROLE;
}

export function isViewerRole(role?: string): boolean {
  return !!role && VIEWER_ROLES.includes(role);
}
