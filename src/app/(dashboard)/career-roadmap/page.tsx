"use client";

import { Award, Briefcase, FileText, Map, Sparkles, Users } from "lucide-react";

import {
  PlanBusyState,
  PlanEmptyState,
  PlanFailedState,
  PlanHollowState,
} from "@/components/career/PlanStates";
import AccessRestricted from "@/components/layout/AccessRestricted";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCareerPlan } from "@/hooks/useCareerPlan";
import { isCandidate } from "@/lib/roles";
import { useAuth } from "@/store/auth-context";
import { CareerRoadmap, RoadmapAction, RoadmapHorizon, RoadmapPhase } from "@/types/career";

const HORIZON_ORDER: RoadmapHorizon[] = ["30-day", "90-day", "180-day", "12-month"];

const HORIZON_LABEL: Record<RoadmapHorizon, string> = {
  "30-day": "First 30 days",
  "90-day": "First 90 days",
  "180-day": "First 180 days",
  "12-month": "12-month outlook",
};

const FOCUS_AREA_ICON: Record<RoadmapAction["focus_area"], typeof Award> = {
  skill: Award,
  certification: Award,
  resume: FileText,
  experience: Briefcase,
  networking: Users,
};

export default function CareerRoadmapPage() {
  const { user } = useAuth();

  if (!isCandidate(user?.role)) {
    return <AccessRestricted message="The career roadmap is only available to candidates." />;
  }

  return <CareerRoadmapView />;
}

function CareerRoadmapView() {
  const { plan, isLoading, isGenerating, error, generate } = useCareerPlan();
  const isBusy = plan?.status === "pending" || plan?.status === "processing";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Career Roadmap</h1>
          <p className="mt-1 text-sm text-slate-500">
            A phased plan — 30 days, 90 days, 180 days, and a 12-month outlook — to
            close your gaps and get you ready.
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
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading your roadmap...
        </p>
      ) : !plan ? (
        <PlanEmptyState
          icon={Map}
          message="You haven't generated a career roadmap yet. It's built from your profile and computed benchmark matches."
          ctaLabel="Generate my roadmap"
          isGenerating={isGenerating}
          onGenerate={generate}
        />
      ) : isBusy ? (
        <PlanBusyState message="Building your roadmap from your latest gap analysis. This usually takes a moment..." />
      ) : plan.status === "failed" ? (
        <PlanFailedState error={plan.error} isGenerating={isGenerating} onGenerate={generate} />
      ) : plan.gap_report?.target_benchmarks.length === 0 ? (
        <PlanHollowState isGenerating={isGenerating} onGenerate={generate} />
      ) : plan.roadmap ? (
        <RoadmapSections roadmap={plan.roadmap} llmUsed={plan.llm_used} notes={plan.notes} />
      ) : null}
    </div>
  );
}

function RoadmapSections({
  roadmap,
  llmUsed,
  notes,
}: {
  roadmap: CareerRoadmap;
  llmUsed: boolean;
  notes: string[];
}) {
  const orderedPhases = HORIZON_ORDER.map((horizon) =>
    roadmap.phases.find((phase) => phase.horizon === horizon)
  ).filter((phase): phase is RoadmapPhase => Boolean(phase));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Target role
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {roadmap.target_role ?? "Not specified"}
            </p>
          </div>
          <Badge variant={roadmap.generated_by === "deterministic" ? "outline" : "secondary"}>
            {roadmap.generated_by === "deterministic" ? "Deterministic" : "AI-enhanced"}
          </Badge>
        </div>
        {roadmap.summary && (
          <p className="mt-4 text-sm text-slate-600">{roadmap.summary}</p>
        )}
      </div>

      {orderedPhases.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No roadmap phases were generated.
        </p>
      ) : (
        <div className="space-y-4">
          {orderedPhases.map((phase) => (
            <PhaseCard key={phase.horizon} phase={phase} />
          ))}
        </div>
      )}

      {!llmUsed && notes.length > 0 && (
        <p className="text-xs text-slate-400">{notes.join(" ")}</p>
      )}
    </div>
  );
}

function PhaseCard({ phase }: { phase: RoadmapPhase }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">
        {HORIZON_LABEL[phase.horizon]}
      </h2>
      <p className="mt-1 text-lg font-semibold text-slate-900">{phase.goal}</p>

      {phase.actions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No actions for this phase.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {phase.actions.map((action, index) => {
            const Icon = FOCUS_AREA_ICON[action.focus_area] ?? Award;
            return (
              <li key={index} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                <Icon size={18} className="mt-0.5 shrink-0 text-indigo-600" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{action.action}</span>
                    <Badge variant="outline">{action.focus_area}</Badge>
                  </div>
                  {action.detail && (
                    <p className="mt-1 text-sm text-slate-500">{action.detail}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
