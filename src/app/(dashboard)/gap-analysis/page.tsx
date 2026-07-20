"use client";

import { FileWarning, Sparkles, Target } from "lucide-react";

import {
  PlanBusyState,
  PlanEmptyState,
  PlanFailedState,
  PlanHollowState,
} from "@/components/career/PlanStates";
import AccessRestricted from "@/components/layout/AccessRestricted";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCareerPlan } from "@/hooks/useCareerPlan";
import { isCandidate } from "@/lib/roles";
import { useAuth } from "@/store/auth-context";
import {
  DetailedGapReport,
  OverallRecommendation,
  PrioritizedSkillGap,
  ResumeIssue,
} from "@/types/career";

const RECOMMENDATION_COPY: Record<
  OverallRecommendation,
  { label: string; variant: "secondary" | "outline" | "destructive" }
> = {
  ready: { label: "Ready to apply", variant: "secondary" },
  developing: { label: "Developing", variant: "outline" },
  not_ready: { label: "Not yet ready", variant: "destructive" },
};

const BAND_VARIANT: Record<string, "secondary" | "outline" | "destructive"> = {
  high: "destructive",
  medium: "outline",
  low: "secondary",
};

export default function GapAnalysisPage() {
  const { user } = useAuth();

  if (!isCandidate(user?.role)) {
    return <AccessRestricted message="Gap analysis is only available to candidates." />;
  }

  return <GapAnalysisView />;
}

function GapAnalysisView() {
  const { plan, isLoading, isGenerating, error, generate } = useCareerPlan();
  const isBusy = plan?.status === "pending" || plan?.status === "processing";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gap Analysis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A detailed breakdown of the skills, certifications, and resume issues
            standing between you and your target roles.
          </p>
        </div>
        {plan?.status === "completed" && (
          <Button type="button" onClick={generate} disabled={isGenerating || isBusy}>
            <Sparkles size={14} data-icon="inline-start" />
            {isGenerating ? "Regenerating..." : "Regenerate"}
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      {isLoading ? (
        <Card className="text-sm text-muted-foreground">Loading your gap analysis...</Card>
      ) : !plan ? (
        <PlanEmptyState
          icon={Target}
          message="You haven't generated a gap analysis yet. It's built from your profile and computed benchmark matches."
          ctaLabel="Generate my gap analysis"
          isGenerating={isGenerating}
          onGenerate={generate}
        />
      ) : isBusy ? (
        <PlanBusyState message="Analyzing your profile against active benchmarks. This usually takes a moment..." />
      ) : plan.status === "failed" ? (
        <PlanFailedState error={plan.error} isGenerating={isGenerating} onGenerate={generate} />
      ) : plan.gap_report?.target_benchmarks.length === 0 ? (
        <PlanHollowState isGenerating={isGenerating} onGenerate={generate} />
      ) : plan.gap_report ? (
        <GapReportSections report={plan.gap_report} llmUsed={plan.llm_used} notes={plan.notes} />
      ) : null}
    </div>
  );
}

function GapReportSections({
  report,
  llmUsed,
  notes,
}: {
  report: DetailedGapReport;
  llmUsed: boolean;
  notes: string[];
}) {
  const recommendation = RECOMMENDATION_COPY[report.overall_recommendation];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Overall readiness
            </p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {Math.round(report.overall_readiness_score)}%
            </p>
          </div>
          <Badge variant={recommendation.variant}>{recommendation.label}</Badge>
        </div>
        {report.target_benchmarks.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Measured against: {report.target_benchmarks.join(", ")}
          </p>
        )}
        {report.narrative && (
          <p className="mt-4 text-sm text-muted-foreground">{report.narrative}</p>
        )}
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Target size={16} className="text-indigo-600" />
          Skill gaps
        </h2>
        {report.skill_gaps.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No prioritized skill gaps found.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {report.skill_gaps.map((gap: PrioritizedSkillGap) => (
              <li
                key={gap.skill}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{gap.skill}</span>
                  <Badge variant="outline">{gap.kind}</Badge>
                  {gap.needed_by_benchmarks.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      needed for {gap.needed_by_benchmarks.join(", ")}
                    </span>
                  )}
                </div>
                <Badge variant={BAND_VARIANT[gap.priority_band] ?? "outline"}>
                  {gap.priority_band} priority
                </Badge>
              </li>
            ))}
          </ul>
        )}

        {report.missing_certifications.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Missing certifications
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {report.missing_certifications.map((cert: string) => (
                <Badge key={cert} variant="destructive">
                  {cert}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {report.experience_gap_years > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            You are {report.experience_gap_years} year(s) short of your target roles'
            experience requirements.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileWarning size={16} className="text-indigo-600" />
          Resume issues
        </h2>
        {report.resume_issues.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No resume issues detected.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {report.resume_issues.map((issue: ResumeIssue, index: number) => (
              <li key={`${issue.type}-${index}`} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={BAND_VARIANT[issue.severity] ?? "outline"}>
                    {issue.severity}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{issue.detail}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{issue.suggestion}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {!llmUsed && notes.length > 0 && (
        <p className="text-xs text-muted-foreground">{notes.join(" ")}</p>
      )}
    </div>
  );
}
