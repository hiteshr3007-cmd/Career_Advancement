"use client";

import { isCandidate, isViewerRole } from "@/lib/roles";
import { useAuth } from "@/store/auth-context";

import CandidateDashboard from "./CandidateDashboard";
import ViewerDashboard from "./ViewerDashboard";

export default function DashboardView() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your dashboard...</p>;
  }

  if (isCandidate(user?.role)) {
    return <CandidateDashboard />;
  }

  if (isViewerRole(user?.role)) {
    return <ViewerDashboard />;
  }

  return (
    <p className="text-sm text-muted-foreground">
      We don&apos;t have a dashboard set up for your account role yet.
    </p>
  );
}
