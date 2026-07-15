import { Award, Briefcase } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Benchmark } from "@/types/benchmark";
import { MatchRecommendation, MatchResult } from "@/types/matching";

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

export const RECOMMENDATION_COPY: Record<
  MatchRecommendation,
  { label: string; variant: "secondary" | "outline" | "destructive" }
> = {
  ready: { label: "Ready to apply", variant: "secondary" },
  developing: { label: "Developing", variant: "outline" },
  not_ready: { label: "Not yet ready", variant: "destructive" },
};

export function MatchCard({ match, benchmark }: { match: MatchResult; benchmark?: Benchmark }) {
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
          Solid badges are skills the candidate has; red badges are required items
          they are missing.
        </p>
      </section>

      <section className="mt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Briefcase size={16} className="text-indigo-600" />
          Experience
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          {match.gap_summary.experience_gap.years_short > 0
            ? `${match.gap_summary.experience_gap.years_short} year(s) short of the ${match.gap_summary.experience_gap.benchmark_min_years}-year minimum (has ${match.gap_summary.experience_gap.candidate_years}).`
            : `Meets the experience requirement (${match.gap_summary.experience_gap.candidate_years} years vs. a ${match.gap_summary.experience_gap.benchmark_min_years}-year minimum).`}
        </p>
      </section>

      <p className="mt-4 text-xs text-slate-400">
        Computed {new Date(match.computed_at).toLocaleString()}
      </p>
    </div>
  );
}
