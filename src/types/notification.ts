// Notifications are computed client-side from existing Phase 1/2 data (resumes,
// matches, profile, benchmarks, candidates) — there is no notifications model
// or endpoint on the backend.
export type NotificationTone = "info" | "warning" | "success";

export interface NotificationItem {
  id: string;
  tone: NotificationTone;
  title: string;
  description?: string;
  href?: string;
}
