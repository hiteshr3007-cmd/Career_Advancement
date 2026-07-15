"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Award, Briefcase, Shield, Target, TrendingUp, Users } from "lucide-react";

import WelcomeCard from "./WelcomeCard";
import StatsCard from "./StatsCard";
import AnalyticsChart from "./AnalyticsChart";
import ActivityCard, { InsightItem } from "./ActivityCard";
import DashboardCard, { DashboardCardItem } from "./DashboardCard";

import { extractApiError } from "@/lib/api";
import { isAdmin } from "@/lib/roles";
import benchmarkService from "@/services/benchmark.service";
import candidateService from "@/services/candidate.service";
import { useAuth } from "@/store/auth-context";
import { Benchmark } from "@/types/benchmark";
import { CandidateSearchResult } from "@/types/candidate";

const PREVIEW_SIZE = 5;
// Largest page the backend allows (candidates.py: Query(20, le=100)) — analytics
// run over this sample rather than a second paginated fetch loop, since a
// dashboard summary doesn't need to be exact for pools larger than 100.
const ANALYTICS_SAMPLE_SIZE = 100;
const TREND_MONTHS = 6;

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function mostCommon(values: string[]): { value: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: { value: string; count: number } | null = null;
  for (const [value, count] of counts) {
    if (!best || count > best.count) best = { value, count };
  }
  return best;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function registrationsByMonth(candidates: CandidateSearchResult[]) {
  const now = new Date();
  const buckets: { key: string; label: string; value: number }[] = [];
  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      value: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const candidate of candidates) {
    const created = new Date(candidate.created_at);
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.value += 1;
  }
  return buckets.map(({ label: l, value }) => ({ label: l, value }));
}

// Mirrors the substring match the matching engine uses to pick candidate
// benchmarks (app/services/matching/engine.py / api/v1/matching.py): a
// candidate's industry is "covered" if some active benchmark's category
// contains it (case-insensitive).
function uncoveredIndustries(candidates: CandidateSearchResult[], benchmarks: Benchmark[]): string[] {
  const industries = new Set(
    candidates.map((c) => c.industry?.trim()).filter((v): v is string => Boolean(v))
  );
  const categories = benchmarks.map((b) => b.category.toLowerCase());
  return [...industries].filter(
    (industry) => !categories.some((category) => category.includes(industry.toLowerCase()))
  );
}

export default function ViewerDashboard() {
  const { user } = useAuth();
  const [results, setResults] = useState<CandidateSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      candidateService.searchCandidates({ limit: ANALYTICS_SAMPLE_SIZE, offset: 0 }),
      benchmarkService.listBenchmarks({ is_active: true, limit: ANALYTICS_SAMPLE_SIZE }),
    ])
      .then(([candidatePage, activeBenchmarks]) => {
        if (!isMounted) return;
        setResults(candidatePage.items);
        setTotal(candidatePage.total);
        setBenchmarks(activeBenchmarks);
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

  const candidateItems: DashboardCardItem[] = results.slice(0, PREVIEW_SIZE).map((candidate) => ({
    id: candidate.id,
    name: candidate.full_name,
    subtitle: [candidate.current_designation, candidate.industry].filter(Boolean).join(" · ") || undefined,
    badge: candidate.experience_level ? label(candidate.experience_level) : undefined,
  }));

  const isSampled = total > results.length;
  const chartData = results.length > 0 ? registrationsByMonth(results) : [];
  const avgCompleteness = average(results.map((c) => c.profile_completeness));
  const avgExperience = average(
    results.map((c) => c.total_experience_years).filter((v): v is number => v != null)
  );
  const topIndustry = mostCommon(results.map((c) => c.industry ?? ""));
  const topSkill = mostCommon(results.flatMap((c) => c.skills.map((s) => s.name)));
  const topLevel = mostCommon(results.map((c) => c.experience_level ?? ""));
  const gapIndustries = benchmarks.length > 0 ? uncoveredIndustries(results, benchmarks) : [];

  const insights: InsightItem[] = [];
  if (topIndustry) {
    insights.push({
      id: "top-industry",
      icon: <Briefcase size={18} className="text-indigo-600" />,
      title: `${topIndustry.value} is your top industry`,
      description: `${topIndustry.count} of ${results.length} candidates`,
    });
  }
  if (topSkill) {
    insights.push({
      id: "top-skill",
      icon: <Award size={18} className="text-indigo-600" />,
      title: `${label(topSkill.value)} is your most common skill`,
      description: `Listed by ${topSkill.count} candidate${topSkill.count === 1 ? "" : "s"}`,
    });
  }
  if (topLevel) {
    insights.push({
      id: "top-level",
      icon: <TrendingUp size={18} className="text-indigo-600" />,
      title: `${label(topLevel.value)} is your most common experience level`,
      description: `${topLevel.count} of ${results.length} candidates`,
    });
  }
  if (gapIndustries.length > 0) {
    insights.push({
      id: "coverage-gap",
      icon: <AlertTriangle size={18} className="text-amber-500" />,
      title: `No active benchmark covers ${gapIndustries.slice(0, 2).join(", ")}${
        gapIndustries.length > 2 ? ` +${gapIndustries.length - 2} more` : ""
      }`,
      description: "Candidates in these industries can't be matched yet.",
    });
  }

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
        <StatsCard
          title="Active Benchmarks"
          value={String(benchmarks.length)}
          subtitle={benchmarks.length === 0 ? "Add one to start matching" : "Ready to match candidates"}
          icon={<Target size={24} />}
        />
        <StatsCard
          title="Avg. Profile Completeness"
          value={avgCompleteness != null ? `${Math.round(avgCompleteness)}%` : "—"}
          subtitle={isSampled ? `Across ${results.length} sampled candidates` : "Across your talent pool"}
          icon={<Award size={24} />}
        />
        <StatsCard
          title="Avg. Experience"
          value={avgExperience != null ? `${avgExperience.toFixed(1)} yrs` : "—"}
          subtitle={isSampled ? `Across ${results.length} sampled candidates` : "Across your talent pool"}
          icon={<Briefcase size={24} />}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AnalyticsChart
            title="Candidate Analytics"
            subtitle={
              isSampled
                ? `New registrations by month (based on your ${results.length} most recent candidates)`
                : "New registrations by month"
            }
            data={chartData}
            emptyMessage="Candidate analytics will appear once candidates register."
          />
        </div>

        <ActivityCard
          title="Insights"
          badgeLabel="Auto-generated"
          insights={insights}
          emptyMessage="Insights will appear once your talent pool has some data."
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
