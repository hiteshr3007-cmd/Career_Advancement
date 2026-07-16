// Dispatched on `window` whenever candidate-owned data (profile, resumes,
// matches) changes, so `useNotifications` can refetch without a page reload.
export const NOTIFICATIONS_REFRESH_EVENT = "notifications:refresh";
