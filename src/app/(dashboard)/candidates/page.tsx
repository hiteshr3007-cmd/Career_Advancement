"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Award,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Search,
  User,
  X,
} from "lucide-react";

import AccessRestricted from "@/components/layout/AccessRestricted";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import candidateService from "@/services/candidate.service";
import { useAuth } from "@/store/auth-context";
import { CandidateSearchFilters, CandidateSearchResult } from "@/types/candidate";

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
  const [filters, setFilters] = useState(EMPTY_FILTERS);
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

  useEffect(() => {
    let isMounted = true;

    candidateService
      .searchCandidates({ ...cleanFilters(EMPTY_FILTERS), limit: PAGE_SIZE, offset: 0 })
      .then((page) => {
        if (isMounted) {
          setResults(page.items);
          setTotal(page.total);
          setOffset(page.offset);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(extractApiError(err, "Couldn't load candidates. Please try again."));
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
        <h1 className="text-2xl font-bold text-slate-900">Candidates</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search and filter the candidate pool by industry, function, experience,
          and skills.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
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

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">Loading candidates...</p>
        ) : results.length === 0 ? (
          <div className="p-8 text-center">
            <User className="mx-auto text-slate-300" size={32} />
            <p className="mt-2 text-sm text-slate-500">
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
                    <div className="font-medium text-slate-900">{candidate.full_name}</div>
                    <div className="text-xs text-slate-500">{candidate.email}</div>
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
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
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
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{candidate.full_name}</h2>
            <p className="mt-1 text-sm text-slate-500">{candidate.email}</p>
            <p className="text-sm text-slate-500">
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
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {candidate.summary && (
          <p className="mt-4 text-sm text-slate-700">{candidate.summary}</p>
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
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
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
              <p className="text-sm text-slate-500">No skills on file.</p>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Briefcase size={16} className="text-indigo-600" />
            Experience
          </h3>
          {candidate.experiences.length ? (
            <ul className="mt-2 space-y-3">
              {candidate.experiences.map((exp) => (
                <li key={exp.id} className="border-l-2 border-indigo-100 pl-3">
                  <p className="text-sm font-medium text-slate-900">
                    {[exp.title, exp.company].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatRange(exp.start_date, exp.end_date, exp.is_current)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No experience on file.</p>
          )}
        </section>

        <section className="mt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <GraduationCap size={16} className="text-indigo-600" />
            Education
          </h3>
          {candidate.education.length ? (
            <ul className="mt-2 space-y-2">
              {candidate.education.map((edu) => (
                <li key={edu.id}>
                  <p className="text-sm font-medium text-slate-900">
                    {[edu.degree, edu.field_of_study].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-xs text-slate-500">{edu.institution}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No education on file.</p>
          )}
        </section>
      </div>
    </div>
  );
}
