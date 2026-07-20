"use client";

import { FormEvent, useEffect, useState } from "react";
import { Award, ChevronLeft, ChevronRight, Plus, Target, X } from "lucide-react";

import AccessRestricted from "@/components/layout/AccessRestricted";
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
import { useAuth } from "@/store/auth-context";
import {
  Benchmark,
  BENCHMARK_LEVELS,
  BenchmarkFilters,
  BenchmarkFormInput,
} from "@/types/benchmark";

const PAGE_SIZE = 20;

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const EMPTY_FILTERS: BenchmarkFilters = {
  category: "",
  level: "",
  functional_area: "",
  is_active: true,
};

const EMPTY_FORM: BenchmarkFormInput = {
  name: "",
  category: "",
  functional_area: "",
  level: BENCHMARK_LEVELS[0],
  min_experience_years: 0,
  max_experience_years: null,
  required_skills: [],
  preferred_skills: [],
  required_certifications: [],
  preferred_certifications: [],
  description: "",
};

export default function BenchmarksPage() {
  const { user } = useAuth();

  if (!isViewerRole(user?.role)) {
    return (
      <AccessRestricted message="The benchmark repository is only available to recruiters, HR reviewers, employers, and administrators." />
    );
  }

  return <BenchmarksView canManage />;
}

function BenchmarksView({ canManage }: { canManage: boolean }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Benchmark | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const cleanFilters = (activeFilters: BenchmarkFilters) =>
    Object.fromEntries(
      Object.entries(activeFilters).filter(([, value]) => value !== "" && value !== undefined)
    );

  const runSearch = async (activeFilters: BenchmarkFilters, targetOffset: number) => {
    setIsLoading(true);
    try {
      const data = await benchmarkService.listBenchmarks({
        ...cleanFilters(activeFilters),
        limit: PAGE_SIZE,
        offset: targetOffset,
      });
      setBenchmarks(data);
      setOffset(targetOffset);
      setError(null);
    } catch (err) {
      setError(extractApiError(err, "Couldn't load benchmarks. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runSearch(EMPTY_FILTERS, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    runSearch(filters, 0);
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    runSearch(EMPTY_FILTERS, 0);
  };

  const handlePrevious = () => runSearch(filters, Math.max(0, offset - PAGE_SIZE));
  const handleNext = () => runSearch(filters, offset + PAGE_SIZE);

  const upsertBenchmark = (updated: Benchmark) => {
    setBenchmarks((prev) => {
      const exists = prev.some((b) => b.id === updated.id);
      return exists ? prev.map((b) => (b.id === updated.id ? updated : b)) : [updated, ...prev];
    });
    setSelected((prev) => (prev?.id === updated.id ? updated : prev));
  };

  const markInactive = (benchmarkId: string) => {
    setBenchmarks((prev) =>
      prev.map((b) => (b.id === benchmarkId ? { ...b, is_active: false } : b))
    );
    setSelected((prev) => (prev?.id === benchmarkId ? { ...prev, is_active: false } : prev));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Benchmarks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canManage
              ? "Define and maintain the role benchmarks candidates are matched against."
              : "Browse the role benchmarks used to score your career matches."}
          </p>
        </div>
        {canManage && (
          <Button type="button" onClick={() => setShowCreateForm((v) => !v)}>
            <Plus size={14} data-icon="inline-start" />
            {showCreateForm ? "Close" : "New benchmark"}
          </Button>
        )}
      </div>

      {canManage && showCreateForm && (
        <BenchmarkForm
          submitLabel="Create benchmark"
          onCancel={() => setShowCreateForm(false)}
          onSubmit={async (payload) => {
            const created = await benchmarkService.createBenchmark(payload);
            upsertBenchmark(created);
            setShowCreateForm(false);
          }}
        />
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        <Input
          placeholder="Category"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        />
        <Input
          placeholder="Functional area"
          value={filters.functional_area}
          onChange={(e) => setFilters({ ...filters, functional_area: e.target.value })}
        />
        <select
          className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          value={filters.level}
          onChange={(e) => setFilters({ ...filters, level: e.target.value })}
        >
          <option value="">Any level</option>
          {BENCHMARK_LEVELS.map((level) => (
            <option key={level} value={level}>
              {label(level)}
            </option>
          ))}
        </select>
        {canManage && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={filters.is_active === false}
              onChange={(e) =>
                setFilters({ ...filters, is_active: e.target.checked ? false : true })
              }
            />
            Show deactivated only
          </label>
        )}

        <div className="flex gap-2 lg:col-span-4 lg:justify-end">
          <Button type="submit" disabled={isLoading}>
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
          <p className="p-6 text-sm text-muted-foreground">Loading benchmarks...</p>
        ) : benchmarks.length === 0 ? (
          <div className="p-8 text-center">
            <Target className="mx-auto text-muted-foreground" size={32} />
            <p className="mt-2 text-sm text-muted-foreground">No benchmarks match these filters.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Functional area</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Experience</TableHead>
                {canManage && <TableHead>Status</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {benchmarks.map((benchmark) => (
                <TableRow
                  key={benchmark.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(benchmark)}
                >
                  <TableCell className="font-medium text-foreground">
                    {benchmark.name}
                  </TableCell>
                  <TableCell>{benchmark.category}</TableCell>
                  <TableCell>{benchmark.functional_area ?? "—"}</TableCell>
                  <TableCell>{label(benchmark.level)}</TableCell>
                  <TableCell>
                    {benchmark.min_experience_years}
                    {benchmark.max_experience_years != null
                      ? `–${benchmark.max_experience_years}`
                      : "+"}{" "}
                    yrs
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Badge variant={benchmark.is_active ? "secondary" : "destructive"}>
                        {benchmark.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Showing {benchmarks.length ? offset + 1 : 0}–{offset + benchmarks.length}</p>
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
            disabled={isLoading || benchmarks.length < PAGE_SIZE}
            onClick={handleNext}
          >
            Next
            <ChevronRight size={14} data-icon="inline-end" />
          </Button>
        </div>
      </div>

      {selected && (
        <BenchmarkDetailModal
          benchmark={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onUpdated={upsertBenchmark}
          onDeactivated={markInactive}
        />
      )}
    </div>
  );
}

// ---- Detail / edit modal ----------------------------------------------------

function BenchmarkDetailModal({
  benchmark,
  canManage,
  onClose,
  onUpdated,
  onDeactivated,
}: {
  benchmark: Benchmark;
  canManage: boolean;
  onClose: () => void;
  onUpdated: (benchmark: Benchmark) => void;
  onDeactivated: (benchmarkId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleStatus = async () => {
    setIsTogglingStatus(true);
    setError(null);
    try {
      if (benchmark.is_active) {
        await benchmarkService.deactivateBenchmark(benchmark.id);
        onDeactivated(benchmark.id);
      } else {
        const updated = await benchmarkService.activateBenchmark(benchmark.id);
        onUpdated(updated);
      }
    } catch (err) {
      setError(extractApiError(err, "Couldn't update status."));
    } finally {
      setIsTogglingStatus(false);
    }
  };

  if (isEditing) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        onClick={onClose}
      >
        <div
          className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 text-card-foreground shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <BenchmarkForm
            initial={benchmark}
            submitLabel="Save changes"
            onCancel={() => setIsEditing(false)}
            onSubmit={async (payload) => {
              const updated = await benchmarkService.updateBenchmark(benchmark.id, payload);
              onUpdated(updated);
              setIsEditing(false);
            }}
          />
        </div>
      </div>
    );
  }

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
            <h2 className="text-xl font-bold text-foreground">{benchmark.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {[benchmark.category, benchmark.functional_area, label(benchmark.level)]
                .filter(Boolean)
                .join(" · ")}
            </p>
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

        {benchmark.description && (
          <p className="mt-4 text-sm text-foreground">{benchmark.description}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">
            {benchmark.min_experience_years}
            {benchmark.max_experience_years != null ? `–${benchmark.max_experience_years}` : "+"}{" "}
            yrs experience
          </Badge>
          {canManage && (
            <Badge variant={benchmark.is_active ? "secondary" : "destructive"}>
              {benchmark.is_active ? "Active" : "Inactive"}
            </Badge>
          )}
        </div>

        <section className="mt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Award size={16} className="text-indigo-600" />
            Skills & certifications
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {benchmark.required_skills.map((skill) => (
              <Badge key={`req-skill-${skill}`} variant="secondary">
                {skill}
              </Badge>
            ))}
            {benchmark.preferred_skills.map((skill) => (
              <Badge key={`pref-skill-${skill}`} variant="outline">
                {skill}
              </Badge>
            ))}
            {benchmark.required_certifications.map((cert) => (
              <Badge key={`req-cert-${cert}`} variant="secondary">
                {cert}
              </Badge>
            ))}
            {benchmark.preferred_certifications.map((cert) => (
              <Badge key={`pref-cert-${cert}`} variant="outline">
                {cert}
              </Badge>
            ))}
            {benchmark.required_skills.length === 0 &&
              benchmark.preferred_skills.length === 0 &&
              benchmark.required_certifications.length === 0 &&
              benchmark.preferred_certifications.length === 0 && (
                <p className="text-sm text-muted-foreground">No skills or certifications listed.</p>
              )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Solid badges are required; outlined badges are preferred.
          </p>
        </section>

        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
        )}

        {canManage && (
          <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isTogglingStatus}
              onClick={handleToggleStatus}
            >
              {benchmark.is_active ? "Deactivate" : "Activate"}
            </Button>
            <Button type="button" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Create / edit form ------------------------------------------------------

function BenchmarkForm({
  initial,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial?: Benchmark;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (payload: BenchmarkFormInput) => Promise<void>;
}) {
  const [form, setForm] = useState<BenchmarkFormInput>(
    initial
      ? {
          name: initial.name,
          category: initial.category,
          functional_area: initial.functional_area ?? "",
          level: initial.level,
          min_experience_years: initial.min_experience_years,
          max_experience_years: initial.max_experience_years,
          required_skills: initial.required_skills,
          preferred_skills: initial.preferred_skills,
          required_certifications: initial.required_certifications,
          preferred_certifications: initial.preferred_certifications,
          description: initial.description ?? "",
        }
      : EMPTY_FORM
  );
  const [skillsText, setSkillsText] = useState(form.required_skills.join(", "));
  const [preferredSkillsText, setPreferredSkillsText] = useState(
    form.preferred_skills.join(", ")
  );
  const [certsText, setCertsText] = useState(form.required_certifications.join(", "));
  const [preferredCertsText, setPreferredCertsText] = useState(
    form.preferred_certifications.join(", ")
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        functional_area: form.functional_area || "",
        required_skills: toList(skillsText),
        preferred_skills: toList(preferredSkillsText),
        required_certifications: toList(certsText),
        preferred_certifications: toList(preferredCertsText),
      });
    } catch (err) {
      setError(extractApiError(err, "Couldn't save this benchmark. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Name</label>
          <Input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Senior Backend Engineer"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Category</label>
          <Input
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="Engineering"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Functional area</label>
          <Input
            value={form.functional_area}
            onChange={(e) => setForm({ ...form, functional_area: e.target.value })}
            placeholder="Information Technology"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Level</label>
          <select
            className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
          >
            {BENCHMARK_LEVELS.map((level) => (
              <option key={level} value={level}>
                {label(level)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Min experience (years)</label>
          <Input
            type="number"
            min="0"
            value={form.min_experience_years}
            onChange={(e) =>
              setForm({ ...form, min_experience_years: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Max experience (years)</label>
          <Input
            type="number"
            min="0"
            value={form.max_experience_years ?? ""}
            placeholder="No cap"
            onChange={(e) =>
              setForm({
                ...form,
                max_experience_years: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Required skills</label>
          <Input
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder="Python, SQL, AWS"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Preferred skills</label>
          <Input
            value={preferredSkillsText}
            onChange={(e) => setPreferredSkillsText(e.target.value)}
            placeholder="Kubernetes, Terraform"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Required certifications</label>
          <Input
            value={certsText}
            onChange={(e) => setCertsText(e.target.value)}
            placeholder="AWS Certified Developer"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Preferred certifications</label>
          <Input
            value={preferredCertsText}
            onChange={(e) => setPreferredCertsText(e.target.value)}
            placeholder="CKA"
          />
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <label className="text-sm font-medium text-foreground">Description</label>
        <textarea
          className="min-h-24 w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="What this benchmark represents and how it's used."
        />
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
