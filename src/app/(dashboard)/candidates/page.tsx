"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Award,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  RefreshCw,
  Search,
  Target,
  User,
  X,
} from "lucide-react";

import AccessRestricted from "@/components/layout/AccessRestricted";
import { MatchCard } from "@/components/matching/MatchCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { extractApiError } from "@/lib/api";
import { isViewerRole } from "@/lib/roles";
import benchmarkService from "@/services/benchmark.service";
import candidateService from "@/services/candidate.service";
import matchingService from "@/services/matching.service";
import { useAuth } from "@/store/auth-context";
import { Benchmark } from "@/types/benchmark";
import { CandidateSearchFilters, CandidateSearchResult } from "@/types/candidate";
import { MatchResult } from "@/types/matching";

const EXPERIENCE_LEVELS = ["entry", "mid", "senior", "lead", "executive"];
const PAGE_SIZE = 20;

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatRange(start?: string | null, end?: string | null, current?: boolean) {
  const startYear = start ? new Date(start).getFullYear() : undefined;
  const endLabel = current ? "Present" : end ? new Date(end).getFullYear() : undefined;
  if (startYear && endLabel) return `${startYear} - ${endLabel}`;
  return String(startYear ?? endLabel ?? "");
}

const EMPTY_FILTERS: CandidateSearchFilters = {
  industry: "",
  functional_area: "",
  experience_level: "",
  skill: "",
  min_experience_years: undefined,
  max_experience_years: undefined,
};

export default function CandidatesPage() {
  const { user } = useAuth();

  if (!isViewerRole(user?.role)) {
    return (
      <AccessRestricted message="The candidate directory is only available to recruiters, HR reviewers, employers, and administrators." />
    );
  }

  return <CandidateDirectory />;
}

function CandidateDirectory() {
  // The topbar's global search hands off a skill term via ?skill=... so the
  // directory opens pre-filtered instead of the user having to retype it.
  const searchParams = useSearchParams();
  const urlSkill = searchParams.get("skill") ?? "";
  const [filters, setFilters] = useState<CandidateSearchFilters>(() => ({
    ...EMPTY_FILTERS,
    skill: urlSkill,
  }));
  const [results, setResults] = useState<CandidateSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CandidateSearchResult | null>(null);

  const cleanFilters = (activeFilters: CandidateSearchFilters) =>
    Object.fromEntries(
      Object.entries(activeFilters).filter(([, value]) => value !== "" && value !== undefined)
    );

  const runSearch = async (activeFilters: CandidateSearchFilters, targetOffset: number) => {
    setIsLoading(true);
    try {
      const page = await candidateService.searchCandidates({
        ...cleanFilters(activeFilters),
        limit: PAGE_SIZE,
        offset: targetOffset,
      });
      setResults(page.items);
      setTotal(page.total);
      setOffset(page.offset);
      setError(null);
    } catch (err) {
      setError(extractApiError(err, "Couldn't load candidates. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  // Re-applies whenever the topbar's global search sends a new ?skill=... —
  // including when we're already sitting on this page, not just on first
  // mount (a plain mount-only effect would miss a second search).
  useEffect(() => {
    const applyUrlSkill = async () => {
      setFilters((prev) => ({ ...prev, skill: urlSkill }));
      await runSearch({ ...EMPTY_FILTERS, skill: urlSkill }, 0);
    };
    applyUrlSkill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSkill]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    runSearch(filters, 0);
  };

  const handlePrevious = () => {
    runSearch(filters, Math.max(0, offset - PAGE_SIZE));
  };

  const handleNext = () => {
    runSearch(filters, offset + PAGE_SIZE);
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    runSearch(EMPTY_FILTERS, 0);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Candidates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search and filter the candidate pool by industry, function, experience,
          and skills.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        <Input
          placeholder="Industry"
          value={filters.industry}
          onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
        />
        <Input
          placeholder="Functional area"
          value={filters.functional_area}
          onChange={(e) => setFilters({ ...filters, functional_area: e.target.value })}
        />
        <select
          aria-label="Experience level"
          className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          value={filters.experience_level}
          onChange={(e) => setFilters({ ...filters, experience_level: e.target.value })}
        >
          <option value="">Any experience level</option>
          {EXPERIENCE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {label(level)}
            </option>
          ))}
        </select>
        <Input
          placeholder="Skill"
          value={filters.skill}
          onChange={(e) => setFilters({ ...filters, skill: e.target.value })}
        />
        <Input
          type="number"
          min="0"
          placeholder="Min years experience"
          value={filters.min_experience_years ?? ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              min_experience_years: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
        <Input
          type="number"
          min="0"
          placeholder="Max years experience"
          value={filters.max_experience_years ?? ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              max_experience_years: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />

        <div className="flex gap-2 lg:col-span-2 lg:justify-end">
          <Button type="submit" disabled={isLoading}>
            <Search size={14} data-icon="inline-start" />
            Search
          </Button>
          <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading}>
            Reset
          </Button>
        </div>
      </form>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading candidates...</p>
        ) : results.length === 0 ? (
          <div className="p-8 text-center">
            <User className="mx-auto text-muted-foreground" size={32} />
            <p className="mt-2 text-sm text-muted-foreground">
              No candidates match these filters.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Top skills</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((candidate) => (
                <TableRow
                  key={candidate.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(candidate)}
                >
                  <TableCell>
                    <div className="font-medium text-foreground">{candidate.full_name}</div>
                    <div className="text-xs text-muted-foreground">{candidate.email}</div>
                  </TableCell>
                  <TableCell>{candidate.current_designation ?? "—"}</TableCell>
                  <TableCell>{candidate.industry ?? "—"}</TableCell>
                  <TableCell>
                    {candidate.experience_level ? label(candidate.experience_level) : "—"}
                  </TableCell>
                  <TableCell>
                    {candidate.total_experience_years != null
                      ? `${candidate.total_experience_years} yrs`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {candidate.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill.id} variant="secondary">
                          {skill.name}
                        </Badge>
                      ))}
                      {candidate.skills.length > 3 && (
                        <Badge variant="outline">+{candidate.skills.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} candidates
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading || offset === 0}
              onClick={handlePrevious}
            >
              <ChevronLeft size={14} data-icon="inline-start" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading || offset + PAGE_SIZE >= total}
              onClick={handleNext}
            >
              Next
              <ChevronRight size={14} data-icon="inline-end" />
            </Button>
          </div>
        </div>
      )}

      {selected && (
        <CandidateDetailModal candidate={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function CandidateDetailModal({
  candidate,
  onClose,
}: {
  candidate: CandidateSearchResult;
  onClose: () => void;
}) {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isComputing, setIsComputing] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const benchmarkById = useMemo(() => {
    const map = new Map<string, Benchmark>();
    benchmarks.forEach((b) => map.set(b.id, b));
    return map;
  }, [benchmarks]);

  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => b.match_score - a.match_score),
    [matches]
  );

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      matchingService.getCandidateMatches(candidate.id),
      benchmarkService.listBenchmarks({ limit: 200 }),
    ])
      .then(([matchData, benchmarkData]) => {
        if (!isMounted) return;
        setMatches(matchData);
        setBenchmarks(benchmarkData);
        setMatchError(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        setMatchError(extractApiError(err, "Couldn't load benchmark matches."));
      })
      .finally(() => {
        if (isMounted) setIsLoadingMatches(false);
      });

    return () => {
      isMounted = false;
    };
  }, [candidate.id]);

  const handleCompute = async () => {
    setIsComputing(true);
    setMatchError(null);
    try {
      const computed = await matchingService.computeCandidateMatches(candidate.id);
      setMatches((prev) => {
        const byBenchmark = new Map(prev.map((m) => [m.benchmark_id, m]));
        computed.forEach((m) => byBenchmark.set(m.benchmark_id, m));
        return Array.from(byBenchmark.values());
      });
      if (computed.length === 0) {
        setMatchError("No active benchmarks matched this candidate's industry.");
      }
    } catch (err) {
      setMatchError(extractApiError(err, "Couldn't compute matches. Please try again."));
    } finally {
      setIsComputing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 text-card-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{candidate.full_name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{candidate.email}</p>
            <p className="text-sm text-muted-foreground">
              {[candidate.phone, candidate.location].filter(Boolean).join(" · ")}
            </p>
            {candidate.current_designation && (
              <p className="mt-1 text-sm font-medium text-indigo-600">
                {candidate.current_designation}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {candidate.summary && (
          <p className="mt-4 text-sm text-foreground">{candidate.summary}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {candidate.industry && <Badge variant="outline">{candidate.industry}</Badge>}
          {candidate.functional_area && (
            <Badge variant="outline">{candidate.functional_area}</Badge>
          )}
          {candidate.experience_level && (
            <Badge variant="outline">{label(candidate.experience_level)}</Badge>
          )}
          {candidate.total_experience_years != null && (
            <Badge variant="outline">{candidate.total_experience_years} yrs experience</Badge>
          )}
        </div>

        <section className="mt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Award size={16} className="text-indigo-600" />
            Skills & Certifications
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {candidate.skills.map((skill) => (
              <Badge key={skill.id} variant="secondary">
                {skill.name}
              </Badge>
            ))}
            {candidate.certifications.map((cert) => (
              <Badge key={cert} variant="outline">
                {cert}
              </Badge>
            ))}
            {candidate.skills.length === 0 && candidate.certifications.length === 0 && (
              <p className="text-sm text-muted-foreground">No skills on file.</p>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Briefcase size={16} className="text-indigo-600" />
            Experience
          </h3>
          {candidate.experiences.length ? (
            <ul className="mt-2 space-y-3">
              {candidate.experiences.map((exp) => (
                <li key={exp.id} className="border-l-2 border-indigo-100 pl-3">
                  <p className="text-sm font-medium text-foreground">
                    {[exp.title, exp.company].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRange(exp.start_date, exp.end_date, exp.is_current)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No experience on file.</p>
          )}
        </section>

        <section className="mt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <GraduationCap size={16} className="text-indigo-600" />
            Education
          </h3>
          {candidate.education.length ? (
            <ul className="mt-2 space-y-2">
              {candidate.education.map((edu) => (
                <li key={edu.id}>
                  <p className="text-sm font-medium text-foreground">
                    {[edu.degree, edu.field_of_study].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">{edu.institution}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No education on file.</p>
          )}
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Target size={16} className="text-indigo-600" />
              Benchmark Matches
            </h3>
            <Button type="button" size="sm" onClick={handleCompute} disabled={isComputing}>
              <RefreshCw size={14} data-icon="inline-start" />
              {isComputing ? "Computing..." : "Compute matches"}
            </Button>
          </div>

          {matchError && (
            <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {matchError}
            </p>
          )}

          {isLoadingMatches ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading matches...</p>
          ) : sortedMatches.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No matches yet. Click &quot;Compute matches&quot; to score this candidate
              against active benchmarks.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {sortedMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  benchmark={benchmarkById.get(match.benchmark_id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
