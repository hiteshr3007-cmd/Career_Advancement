"use client";

import { useState } from "react";
import { Award, BadgeCheck, FileText, FolderKanban, Gauge } from "lucide-react";

import AccessRestricted from "@/components/layout/AccessRestricted";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScorecard } from "@/hooks/useScorecard";
import { extractApiError } from "@/lib/api";
import { isCandidate } from "@/lib/roles";
import candidateService from "@/services/candidate.service";
import { useAuth } from "@/store/auth-context";
import { SkillOut } from "@/types/candidate";
import { MetricStatus, ScorecardMetric, ScorecardOut, SkillScore } from "@/types/scorecard";

const STATUS_VARIANT: Record<MetricStatus, "secondary" | "outline" | "destructive"> = {
  Good: "secondary",
  Medium: "outline",
  Improve: "outline",
  Critical: "destructive",
};

const HEADLINE_ICON: Record<string, typeof Gauge> = {
  employability: Gauge,
  technical: Award,
  resume: FileText,
  projects: FolderKanban,
  certifications: BadgeCheck,
};

export default function ScorecardPage() {
  const { user } = useAuth();

  if (!isCandidate(user?.role)) {
    return <AccessRestricted message="The scorecard is only available to candidates." />;
  }

  return <ScorecardView />;
}

function ScorecardView() {
  const { scorecard, skills, isLoading, error, refresh } = useScorecard();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Employability Scorecard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A live snapshot of your readiness, built from your resume, skills, and benchmark
          matches.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      {isLoading ? (
        <Card className="text-sm text-muted-foreground">Loading your scorecard...</Card>
      ) : !scorecard ? null : (
        <ScorecardSections scorecard={scorecard} skills={skills} onSkillRated={refresh} />
      )}
    </div>
  );
}

function ScorecardSections({
  scorecard,
  skills,
  onSkillRated,
}: {
  scorecard: ScorecardOut;
  skills: SkillOut[];
  onSkillRated: () => void;
}) {
  const headlineCards = [
    { key: "employability", label: "Employability", value: scorecard.employability_score },
    { key: "technical", label: "Technical Skills", value: scorecard.technical_skills_score },
    { key: "resume", label: "Resume", value: scorecard.resume_score },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {headlineCards.map((item) => {
          const Icon = HEADLINE_ICON[item.key];
          return (
            <Card key={item.key}>
              <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <Icon size={14} />
                {item.label}
              </div>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {Math.round(item.value)}
                <span className="text-base font-medium text-muted-foreground">/100</span>
              </p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card size="sm">
          <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <FolderKanban size={14} />
            Projects
          </p>
          <p className="mt-1 text-xl font-semibold text-foreground">{scorecard.projects_count}</p>
        </Card>
        <Card size="sm">
          <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <BadgeCheck size={14} />
            Certifications
          </p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {scorecard.certifications_count}
          </p>
        </Card>
        <Card size="sm">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Best benchmark readiness
          </p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {scorecard.benchmark_readiness != null
              ? `${Math.round(scorecard.benchmark_readiness)}%`
              : "—"}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-foreground">Metrics</h2>
        {scorecard.metrics.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No metrics available yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {scorecard.metrics.map((metric: ScorecardMetric) => (
              <li
                key={metric.metric}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
              >
                <span className="font-medium text-foreground">{metric.metric}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {metric.current}
                    {metric.unit} of {metric.target}
                    {metric.unit} target
                  </span>
                  <Badge variant={STATUS_VARIANT[metric.status]}>{metric.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-foreground">Per-skill scores</h2>
        {scorecard.skill_scores.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No skills on your profile yet — add some from your Candidate Profile page.
          </p>
        ) : (
          <div className="mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>Your rating</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scorecard.skill_scores.map((skillScore) => (
                  <SkillScoreRow
                    key={skillScore.name}
                    skillScore={skillScore}
                    skillId={
                      skills.find(
                        (s) => s.name.toLowerCase() === skillScore.name.toLowerCase()
                      )?.id
                    }
                    onRated={onSkillRated}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

function SkillScoreRow({
  skillScore,
  skillId,
  onRated,
}: {
  skillScore: SkillScore;
  skillId: string | undefined;
  onRated: () => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rate = async (value: number) => {
    if (!skillId) return;
    setIsSaving(true);
    setError(null);
    try {
      await candidateService.updateSkill(skillId, { manual_score: value });
      onRated();
    } catch (err) {
      setError(extractApiError(err, "Couldn't save your rating."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium text-foreground">
        {skillScore.name}
        {skillScore.proficiency && (
          <span className="ml-2 text-xs text-muted-foreground">{skillScore.proficiency}</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1.5">
          {skillScore.in_resume && <Badge variant="secondary">In resume</Badge>}
          {skillScore.in_project && <Badge variant="secondary">In project</Badge>}
          {!skillScore.in_resume && !skillScore.in_project && (
            <Badge variant="outline">No evidence yet</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        {skillId ? (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                disabled={isSaving}
                onClick={() => rate(value)}
                aria-label={`Rate ${skillScore.name} ${value} out of 5`}
                className={`size-6 rounded-md border text-xs font-medium transition-colors disabled:opacity-50 ${
                  (skillScore.manual_score ?? 0) >= value
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </TableCell>
      <TableCell className="font-medium text-foreground">{Math.round(skillScore.score)}</TableCell>
    </TableRow>
  );
}
