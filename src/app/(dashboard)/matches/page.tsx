"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Target } from "lucide-react";

import AccessRestricted from "@/components/layout/AccessRestricted";
import { MatchCard } from "@/components/matching/MatchCard";
import { Button } from "@/components/ui/button";
import { extractApiError } from "@/lib/api";
import { isCandidate } from "@/lib/roles";
import benchmarkService from "@/services/benchmark.service";
import matchingService from "@/services/matching.service";
import { useAuth } from "@/store/auth-context";
import { Benchmark } from "@/types/benchmark";
import { MatchResult } from "@/types/matching";

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
