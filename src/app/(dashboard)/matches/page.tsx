"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, Briefcase, RefreshCw, Target } from "lucide-react";

import AccessRestricted from "@/components/layout/AccessRestricted";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { extractApiError } from "@/lib/api";
import { isCandidate } from "@/lib/roles";
import benchmarkService from "@/services/benchmark.service";
import matchingService from "@/services/matching.service";
import { useAuth } from "@/store/auth-context";
import { Benchmark } from "@/types/benchmark";
import { MatchRecommendation, MatchResult } from "@/types/matching";

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

const RECOMMENDATION_COPY: Record<MatchRecommendation, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  ready: { label: "Ready to apply", variant: "secondary" },
  developing: { label: "Developing", variant: "outline" },
  not_ready: { label: "Not yet ready", variant: "destructive" },
};

export default function MatchesPage() {
  const { user } = useAuth();

  if (!isCandidate(user?.role)) {
    return (
      <AccessRestricted message="Career matches are only available to candidates." />
    );
  }

  return <CareerMatchesView />;
}

function CareerMatchesView() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const benchmarkById = useMemo(() => {
    const map = new Map<string, Benchmark>();
    benchmarks.forEach((b) => map.set(b.id, b));
    return map;
  }, [benchmarks]);

  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => b.match_score - a.match_score),
    [matches]
  );

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [matchData, benchmarkData] = await Promise.all([
        matchingService.getMyMatches(),
        benchmarkService.listBenchmarks({ limit: 200 }),
      ]);
      setMatches(matchData);
      setBenchmarks(benchmarkData);
      setError(null);
    } catch (err) {
      setError(extractApiError(err, "Couldn't load your matches. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCompute = async () => {
    setIsComputing(true);
    setError(null);
    try {
      const computed = await matchingService.computeMyMatches();
      setMatches((prev) => {
        const byBenchmark = new Map(prev.map((m) => [m.benchmark_id, m]));
        computed.forEach((m) => byBenchmark.set(m.benchmark_id, m));
        return Array.from(byBenchmark.values());
      });
      if (computed.length === 0) {
        setError(
          "No active benchmarks matched your profile. Ask a recruiter to add one for your industry, or browse benchmarks to see what's available."
        );
      }
    } catch (err) {
      setError(extractApiError(err, "Couldn't compute matches. Please try again."));
    } finally {
      setIsComputing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Career Matches</h1>
          <p className="mt-1 text-sm text-slate-500">
            See how your profile stacks up against active role benchmarks, and what's
            missing to get there.
          </p>
        </div>
        <Button type="button" onClick={handleCompute} disabled={isComputing}>
          <RefreshCw size={14} data-icon="inline-start" />
          {isComputing ? "Computing..." : "Compute matches"}
        </Button>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      {isLoading ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading your matches...
        </p>
      ) : sortedMatches.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Target className="mx-auto text-slate-300" size={32} />
          <p className="mt-2 text-sm text-slate-500">
            No matches yet. Click "Compute matches" to score your profile against
            active benchmarks.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              benchmark={benchmarkById.get(match.benchmark_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, benchmark }: { match: MatchResult; benchmark?: Benchmark }) {
  const recommendation = RECOMMENDATION_COPY[match.gap_summary.overall_recommendation];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {benchmark?.name ?? "Benchmark no longer available"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {benchmark
              ? [benchmark.category, benchmark.functional_area, label(benchmark.level)]
                  .filter(Boolean)
                  .join(" · ")
              : "This benchmark may have been deactivated since this match was computed."}
          </p>
        </div>
        <Badge variant={recommendation.variant}>{recommendation.label}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Match score
          </p>
          <p className={`text-2xl font-bold ${scoreColor(match.match_score)}`}>
            {Math.round(match.match_score)}%
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Readiness score
          </p>
          <p className={`text-2xl font-bold ${scoreColor(match.readiness_score)}`}>
            {Math.round(match.readiness_score)}%
          </p>
        </div>
      </div>

      <section className="mt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Award size={16} className="text-indigo-600" />
          Skill & certification gaps
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {match.matched_required_skills.map((skill) => (
            <Badge key={`have-${skill}`} variant="secondary">
              {skill}
            </Badge>
          ))}
          {match.missing_required_skills.map((skill) => (
            <Badge key={`miss-${skill}`} variant="destructive">
              {skill}
            </Badge>
          ))}
          {match.missing_certifications.map((cert) => (
            <Badge key={`miss-cert-${cert}`} variant="destructive">
              {cert}
            </Badge>
          ))}
          {match.matched_required_skills.length === 0 &&
            match.missing_required_skills.length === 0 &&
            match.missing_certifications.length === 0 && (
              <p className="text-sm text-slate-500">
                No required skills or certifications listed on this benchmark.
              </p>
            )}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Solid badges are skills you have; red badges are required items you're
          missing.
        </p>
      </section>

      <section className="mt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Briefcase size={16} className="text-indigo-600" />
          Experience
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          {match.gap_summary.experience_gap.years_short > 0
            ? `You're ${match.gap_summary.experience_gap.years_short} year(s) short of the ${match.gap_summary.experience_gap.benchmark_min_years}-year minimum (you have ${match.gap_summary.experience_gap.candidate_years}).`
            : `You meet the experience requirement (${match.gap_summary.experience_gap.candidate_years} years vs. a ${match.gap_summary.experience_gap.benchmark_min_years}-year minimum).`}
        </p>
      </section>

      <p className="mt-4 text-xs text-slate-400">
        Computed {new Date(match.computed_at).toLocaleString()}
      </p>
    </div>
  );
}
