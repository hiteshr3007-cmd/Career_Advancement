import Link from "next/link";
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

// Shown when generation completed but matched zero benchmarks — most often
// an industry/functional-area mismatch against active benchmark categories.
// Distinct from "0 gaps found" (fully qualified), which is a real result.
export function PlanHollowState({
  isGenerating,
  onGenerate,
}: {
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
      <AlertTriangle className="mx-auto text-amber-500" size={28} />
      <p className="mt-2 text-sm font-medium text-amber-900">
        No active benchmarks matched your profile
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-amber-700">
        This usually means your profile's industry or functional area doesn't line
        up with any active benchmark yet — not that you have no gaps to close.{" "}
        <Link href="/profile" className="font-medium underline hover:text-amber-900">
          Double-check your profile
        </Link>
        , or ask a recruiter/admin to add a benchmark for your field, then
        regenerate.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-4"
        onClick={onGenerate}
        disabled={isGenerating}
      >
        <Sparkles size={14} data-icon="inline-start" />
        {isGenerating ? "Regenerating..." : "Regenerate"}
      </Button>
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
