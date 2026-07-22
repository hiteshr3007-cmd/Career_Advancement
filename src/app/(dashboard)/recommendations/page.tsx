"use client";

import { Award, BookOpen, FileEdit, Sparkles, TrendingUp } from "lucide-react";

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
import { LearningRecommendation, RecommendationSet, ResumeImprovement } from "@/types/career";

const RESOURCE_TYPE_LABEL: Record<LearningRecommendation["resource_type"], string> = {
  course: "Course",
  certification: "Certification",
  practice: "Practice",
  reading: "Reading",
};

export default function RecommendationsPage() {
  const { user } = useAuth();

  if (!isCandidate(user?.role)) {
    return <AccessRestricted message="Recommendations are only available to candidates." />;
  }

  return <RecommendationsView />;
}

function RecommendationsView() {
  const { plan, isLoading, isGenerating, error, generate } = useCareerPlan();
  const isBusy = plan?.status === "pending" || plan?.status === "processing";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recommendations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Learning resources, certifications, resume fixes, and career-development advice
            tailored to your gaps.
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
        <Card className="text-sm text-muted-foreground">Loading your recommendations...</Card>
      ) : !plan ? (
        <PlanEmptyState
          icon={TrendingUp}
          message="You haven't generated recommendations yet. They're built from your profile and computed benchmark matches."
          ctaLabel="Generate my recommendations"
          isGenerating={isGenerating}
          onGenerate={generate}
        />
      ) : isBusy ? (
        <PlanBusyState message="Putting together learning resources and advice based on your gaps. This usually takes a moment..." />
      ) : plan.status === "failed" ? (
        <PlanFailedState error={plan.error} isGenerating={isGenerating} onGenerate={generate} />
      ) : plan.gap_report?.target_benchmarks.length === 0 ? (
        <PlanHollowState isGenerating={isGenerating} onGenerate={generate} />
      ) : plan.recommendations ? (
        <RecommendationSections
          recommendations={plan.recommendations}
          llmUsed={plan.llm_used}
          notes={plan.notes}
        />
      ) : null}
    </div>
  );
}

function RecommendationSections({
  recommendations,
  llmUsed,
  notes,
}: {
  recommendations: RecommendationSet;
  llmUsed: boolean;
  notes: string[];
}) {
  return (
    <div className="space-y-6">
      {recommendations.narrative && (
        <Card>
          <p className="text-sm text-muted-foreground">{recommendations.narrative}</p>
        </Card>
      )}

      <Card>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BookOpen size={16} className="text-indigo-600" />
          Learning
        </h2>
        {recommendations.learning.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No learning resources suggested.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {recommendations.learning.map((item, index) => (
              <LearningItem key={`${item.title}-${index}`} item={item} />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Award size={16} className="text-indigo-600" />
          Certifications
        </h2>
        {recommendations.certifications.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No certification suggestions.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {recommendations.certifications.map((item, index) => (
              <LearningItem key={`${item.title}-${index}`} item={item} />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileEdit size={16} className="text-indigo-600" />
          Resume improvements
        </h2>
        {recommendations.resume_improvements.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No resume improvements suggested.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recommendations.resume_improvements.map((issue: ResumeImprovement, index: number) => (
              <li
                key={`${issue.issue_type}-${index}`}
                className="rounded-xl border border-border p-3"
              >
                <Badge variant="outline">{issue.issue_type}</Badge>
                <p className="mt-1 text-sm text-muted-foreground">{issue.recommendation}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <TrendingUp size={16} className="text-indigo-600" />
          Career development
        </h2>
        {recommendations.career_development.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No career-development advice yet.</p>
        ) : (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {recommendations.career_development.map((advice, index) => (
              <li key={index}>{advice}</li>
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

function LearningItem({ item }: { item: LearningRecommendation }) {
  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">{item.title}</span>
        <Badge variant="outline">{RESOURCE_TYPE_LABEL[item.resource_type]}</Badge>
        <span className="text-xs text-muted-foreground">for {item.skill}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{item.provider}</p>
      {item.rationale && <p className="mt-1 text-sm text-muted-foreground">{item.rationale}</p>}
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          View resource
        </a>
      )}
    </li>
  );
}
