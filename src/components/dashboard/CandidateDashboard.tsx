"use client";

import { useEffect, useState } from "react";
import {
  Award,
  Briefcase,
  FileWarning,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  User as UserIcon,
} from "lucide-react";

import WelcomeCard from "./WelcomeCard";
import StatsCard from "./StatsCard";
import AnalyticsChart from "./AnalyticsChart";
import ActivityCard, { InsightItem } from "./ActivityCard";
import DashboardCard, { DashboardCardItem } from "./DashboardCard";

import benchmarkService from "@/services/benchmark.service";
import candidateService from "@/services/candidate.service";
import matchingService from "@/services/matching.service";
import resumeService from "@/services/resume.service";
import { useAuth } from "@/store/auth-context";
import { Benchmark } from "@/types/benchmark";
import { CandidateProfileOut } from "@/types/candidate";
import { MatchResult } from "@/types/matching";
import { Resume } from "@/types/resume";

const PARSING_LABELS: Record<Resume["parsing_status"], string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Parsed",
  failed: "Failed",
};

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CandidateProfileOut | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      candidateService.getMyProfile(),
      resumeService.listResumes(),
      matchingService.getMyMatches(),
      benchmarkService.listBenchmarks({ limit: 200 }),
    ]).then(([profileResult, resumesResult, matchesResult, benchmarksResult]) => {
      if (!isMounted) return;

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value);
      } else {
        setLoadError("We couldn't load your dashboard. Please refresh the page.");
      }
      if (resumesResult.status === "fulfilled") setResumes(resumesResult.value);
      if (matchesResult.status === "fulfilled") setMatches(matchesResult.value);
      if (benchmarksResult.status === "fulfilled") setBenchmarks(benchmarksResult.value);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading your dashboard...</p>;
  }

  if (loadError || !profile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-600">{loadError ?? "We couldn't load your dashboard."}</p>
      </div>
    );
  }

  const benchmarkById = new Map(benchmarks.map((b) => [b.id, b]));
  const sortedMatches = [...matches].sort((a, b) => b.match_score - a.match_score);
  const bestMatch = sortedMatches[0] ?? null;
  const failedResume = resumes.find((r) => r.parsing_status === "failed");
  const processingResume = resumes.find(
    (r) => r.parsing_status === "pending" || r.parsing_status === "processing"
  );

  const chartData = sortedMatches.slice(0, 7).map((match) => ({
    label: benchmarkById.get(match.benchmark_id)?.name ?? "Benchmark",
    value: Math.round(match.match_score),
  }));

  const insights: InsightItem[] = [];

  if (bestMatch) {
    const benchmarkName = benchmarkById.get(bestMatch.benchmark_id)?.name ?? "a benchmark";
    insights.push({
      id: "best-match",
      icon: <Target className="text-emerald-500" size={20} />,
      title: "Top match",
      description: (
        <>
          You scored <span className="font-medium text-emerald-600">{Math.round(bestMatch.match_score)}%</span> on{" "}
          {benchmarkName}.
        </>
      ),
    });

    if (bestMatch.gap_summary.skill_gap.missing_required.length > 0) {
      insights.push({
        id: "skill-gap",
        icon: <Award className="text-indigo-600" size={20} />,
        title: "Top skill gap",
        description: (
          <>
            Missing for your top match:{" "}
            <span className="font-medium text-indigo-600">
              {bestMatch.gap_summary.skill_gap.missing_required.slice(0, 3).join(", ")}
            </span>
          </>
        ),
      });
    }
  }

  if (failedResume) {
    insights.push({
      id: "resume-failed",
      icon: <FileWarning className="text-rose-500" size={20} />,
      title: "Resume parsing failed",
      description: `"${failedResume.original_file_name}" couldn't be parsed. Try re-uploading a text-based file.`,
    });
  } else if (processingResume) {
    insights.push({
      id: "resume-processing",
      icon: <FileWarning className="text-amber-500" size={20} />,
      title: "Resume still processing",
      description: `We're still analyzing "${processingResume.original_file_name}".`,
    });
  }

  if (profile.profile_completeness < 1) {
    insights.push({
      id: "completeness",
      icon: <UserIcon className="text-sky-500" size={20} />,
      title: "Profile completeness",
      description: (
        <>
          Your profile is <span className="font-medium text-sky-600">{Math.round(profile.profile_completeness * 100)}%</span> complete.
          Add more skills, education, or experience to improve your matches.
        </>
      ),
    });
  }

  const resumeItems: DashboardCardItem[] = resumes.slice(0, 5).map((resume) => ({
    id: resume.id,
    name: resume.original_file_name,
    subtitle: new Date(resume.created_at).toLocaleDateString(),
    badge: PARSING_LABELS[resume.parsing_status],
  }));

  return (
    <div className="space-y-8">
      <WelcomeCard
        name={user?.full_name?.split(" ")[0]}
        subtitle={
          <>
            Your profile is{" "}
            <span className="font-semibold text-white">{Math.round(profile.profile_completeness * 100)}% complete</span>
            {resumes.length > 0 && (
              <>
                {" "}with <span className="font-semibold text-white">{resumes.length}</span> resume
                {resumes.length === 1 ? "" : "s"} on file
              </>
            )}
            {matches.length > 0 && (
              <>
                {" "}and <span className="font-semibold text-white">{matches.length}</span> career match
                {matches.length === 1 ? "" : "es"} computed.
              </>
            )}
            {resumes.length === 0 && " Upload a resume to get started."}
          </>
        }
        actions={[
          { label: "Upload Resume", icon: <Upload size={18} />, href: "/upload" },
          { label: "View Matches", icon: <TrendingUp size={18} />, href: "/matches" },
          { label: "Edit Profile", icon: <UserIcon size={18} />, href: "/profile" },
          {
            label: "Generate Roadmap",
            icon: <Sparkles size={18} />,
            disabled: true,
            disabledReason: "Career Roadmap is coming soon",
          },
        ]}
      />

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Profile Completeness"
          value={`${Math.round(profile.profile_completeness * 100)}%`}
          subtitle="Keep your profile up to date"
          icon={<UserIcon size={24} />}
        />

        <StatsCard
          title="Resumes Uploaded"
          value={String(resumes.length)}
          subtitle={failedResume ? "1 needs attention" : "Manage in My Resumes"}
          icon={<Upload size={24} />}
        />

        <StatsCard
          title="Skills Tracked"
          value={String(profile.skills.length)}
          subtitle="From your resume and profile"
          icon={<Award size={24} />}
        />

        <StatsCard
          title="Career Matches"
          value={String(matches.length)}
          subtitle="Against active benchmarks"
          icon={<Briefcase size={24} />}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AnalyticsChart
            title="Match Scores"
            subtitle="Your top benchmark matches"
            data={chartData}
            emptyMessage="Compute your matches from the Career Matches page to see them here."
          />
        </div>

        <ActivityCard
          title="Career Insights"
          badgeLabel="Live"
          insights={insights}
          emptyMessage="Upload a resume and compute your matches to see personalized insights here."
        />
      </section>

      <DashboardCard
        title="Your Resumes"
        viewAllHref="/upload"
        items={resumeItems}
        emptyMessage="No resumes uploaded yet."
      />
    </div>
  );
}
