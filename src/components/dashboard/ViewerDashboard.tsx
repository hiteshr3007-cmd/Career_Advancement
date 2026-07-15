"use client";

import { useEffect, useState } from "react";
import { Shield, Target, Users } from "lucide-react";

import WelcomeCard from "./WelcomeCard";
import StatsCard from "./StatsCard";
import AnalyticsChart from "./AnalyticsChart";
import ActivityCard from "./ActivityCard";
import DashboardCard, { DashboardCardItem } from "./DashboardCard";

import { extractApiError } from "@/lib/api";
import { isAdmin } from "@/lib/roles";
import candidateService from "@/services/candidate.service";
import { useAuth } from "@/store/auth-context";
import { CandidateSearchResult } from "@/types/candidate";

const PREVIEW_SIZE = 5;

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ViewerDashboard() {
  const { user } = useAuth();
  const [results, setResults] = useState<CandidateSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    candidateService
      .searchCandidates({ limit: PREVIEW_SIZE, offset: 0 })
      .then((page) => {
        if (!isMounted) return;
        setResults(page.items);
        setTotal(page.total);
      })
      .catch((err) => {
        if (isMounted) {
          setLoadError(extractApiError(err, "We couldn't load your dashboard. Please refresh the page."));
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading your dashboard...</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-600">{loadError}</p>
      </div>
    );
  }

  const candidateItems: DashboardCardItem[] = results.map((candidate) => ({
    id: candidate.id,
    name: candidate.full_name,
    subtitle: [candidate.current_designation, candidate.industry].filter(Boolean).join(" · ") || undefined,
    badge: candidate.experience_level ? label(candidate.experience_level) : undefined,
  }));

  return (
    <div className="space-y-8">
      <WelcomeCard
        name={user?.full_name?.split(" ")[0]}
        subtitle={
          total > 0 ? (
            <>
              Your talent pool has <span className="font-semibold text-white">{total}</span> candidate
              {total === 1 ? "" : "s"} on file.
            </>
          ) : (
            "Your talent pool is empty so far — candidates will show up here once they register."
          )
        }
        actions={[
          { label: "View Candidates", icon: <Users size={18} />, href: "/candidates" },
          { label: "Manage Benchmarks", icon: <Target size={18} />, href: "/benchmarks" },
          ...(isAdmin(user?.role)
            ? [{ label: "Admin", icon: <Shield size={18} />, href: "/admin" }]
            : []),
        ]}
      />

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Total Candidates"
          value={String(total)}
          subtitle="Active talent pool"
          icon={<Users size={24} />}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AnalyticsChart
            title="Candidate Analytics"
            subtitle="Pool trends over time"
            data={[]}
            emptyMessage="Candidate analytics are coming soon."
          />
        </div>

        <ActivityCard
          title="Insights"
          badgeLabel="Soon"
          insights={[]}
          emptyMessage="AI-powered recruiting insights are coming soon."
        />
      </section>

      <DashboardCard
        title="Recent Candidates"
        viewAllHref="/candidates"
        items={candidateItems}
        emptyMessage="No candidates match your directory yet."
      />
    </div>
  );
}
