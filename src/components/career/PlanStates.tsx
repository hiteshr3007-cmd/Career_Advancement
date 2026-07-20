import { AlertTriangle, Loader2, LucideIcon, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

// Shared "no plan yet / generating / generation failed" states for the Gap
// Analysis and Career Roadmap pages — both poll the same CareerPlan row.

export function PlanEmptyState({
  icon: Icon,
  message,
  ctaLabel,
  isGenerating,
  onGenerate,
}: {
  icon: LucideIcon;
  message: string;
  ctaLabel: string;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <Icon className="mx-auto text-slate-300" size={32} />
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <Button type="button" className="mt-4" onClick={onGenerate} disabled={isGenerating}>
        <Sparkles size={14} data-icon="inline-start" />
        {isGenerating ? "Starting..." : ctaLabel}
      </Button>
    </div>
  );
}

export function PlanBusyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <Loader2 className="mx-auto animate-spin text-indigo-600" size={28} />
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function PlanFailedState({
  error,
  isGenerating,
  onGenerate,
}: {
  error: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <AlertTriangle className="mx-auto text-rose-400" size={28} />
      <p className="mt-2 text-sm text-slate-500">{error ?? "Generation failed."}</p>
      <Button type="button" className="mt-4" onClick={onGenerate} disabled={isGenerating}>
        <Sparkles size={14} data-icon="inline-start" />
        {isGenerating ? "Retrying..." : "Try again"}
      </Button>
    </div>
  );
}
