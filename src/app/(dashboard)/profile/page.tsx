"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import {
  Award,
  Briefcase,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";

import AccessRestricted from "@/components/layout/AccessRestricted";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { extractApiError } from "@/lib/api";
import { isCandidate } from "@/lib/roles";
import candidateService from "@/services/candidate.service";
import { useAuth } from "@/store/auth-context";
import {
  CandidateProfileOut,
  EducationOut,
  ExperienceOut,
  SkillOut,
} from "@/types/candidate";

const EXPERIENCE_LEVELS = ["entry", "mid", "senior", "lead", "executive"];

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatRange(start?: string | null, end?: string | null, current?: boolean) {
  const startYear = start ? new Date(start).getFullYear() : undefined;
  const endLabel = current ? "Present" : end ? new Date(end).getFullYear() : undefined;
  if (startYear && endLabel) return `${startYear} - ${endLabel}`;
  return String(startYear ?? endLabel ?? "");
}

export default function ProfilePage() {
  const { user } = useAuth();

  if (!isCandidate(user?.role)) {
    return (
      <AccessRestricted message="The candidate profile is only available to candidate accounts." />
    );
  }

  return <CandidateProfileView />;
}

function CandidateProfileView() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CandidateProfileOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    candidateService
      .getMyProfile()
      .then((data) => {
        if (isMounted) setProfile(data);
      })
      .catch(() => {
        if (isMounted) {
          setLoadError(
            "We couldn't load your profile yet. Upload a resume to get started."
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your profile...</p>;
  }

  if (loadError || !profile) {
    return (
      <Card className="p-8 text-center">
        <User className="mx-auto text-muted-foreground" size={40} />
        <p className="mt-3 text-muted-foreground">{loadError ?? "No profile found."}</p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ProfileHeader
        name={user?.full_name}
        email={user?.email}
        profile={profile}
        onUpdated={setProfile}
      />

      <SkillsSection profile={profile} onUpdated={setProfile} />

      <ExperienceSection profile={profile} onUpdated={setProfile} />

      <EducationSection profile={profile} onUpdated={setProfile} />
    </div>
  );
}

// ---- Basic info ------------------------------------------------------------

function ProfileHeader({
  name,
  email,
  profile,
  onUpdated,
}: {
  name?: string;
  email?: string;
  profile: CandidateProfileOut;
  onUpdated: (profile: CandidateProfileOut) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    phone: profile.phone ?? "",
    location: profile.location ?? "",
    summary: profile.summary ?? "",
    current_designation: profile.current_designation ?? "",
    industry: profile.industry ?? "",
    functional_area: profile.functional_area ?? "",
    career_stage: profile.career_stage ?? "",
    experience_level: profile.experience_level ?? "",
    total_experience_years: profile.total_experience_years?.toString() ?? "",
  });

  const startEditing = () => {
    setForm({
      phone: profile.phone ?? "",
      location: profile.location ?? "",
      summary: profile.summary ?? "",
      current_designation: profile.current_designation ?? "",
      industry: profile.industry ?? "",
      functional_area: profile.functional_area ?? "",
      career_stage: profile.career_stage ?? "",
      experience_level: profile.experience_level ?? "",
      total_experience_years: profile.total_experience_years?.toString() ?? "",
    });
    setError(null);
    setIsEditing(true);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const updated = await candidateService.updateProfile({
        phone: form.phone || null,
        location: form.location || null,
        summary: form.summary || null,
        current_designation: form.current_designation || null,
        industry: form.industry || null,
        functional_area: form.functional_area || null,
        career_stage: form.career_stage || null,
        experience_level: form.experience_level || null,
        total_experience_years: form.total_experience_years
          ? Number(form.total_experience_years)
          : null,
      });
      onUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      setError(extractApiError(err, "Couldn't save your profile. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetExperience = async () => {
    setIsResetting(true);
    setError(null);
    try {
      const updated = await candidateService.recalculateExperienceYears();
      onUpdated(updated);
      setForm((prev) => ({
        ...prev,
        total_experience_years: updated.total_experience_years?.toString() ?? "",
      }));
    } catch (err) {
      setError(
        extractApiError(err, "Couldn't recalculate experience. Please try again.")
      );
    } finally {
      setIsResetting(false);
    }
  };

  if (!isEditing) {
    return (
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>
            <p className="text-sm text-muted-foreground">
              {[profile.phone, profile.location].filter(Boolean).join(" · ")}
            </p>
            {profile.current_designation && (
              <p className="mt-1 text-sm font-medium text-indigo-600">
                {profile.current_designation}
              </p>
            )}
            {profile.summary && <p className="mt-4 text-foreground">{profile.summary}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {profile.industry && <Badge variant="outline">{profile.industry}</Badge>}
              {profile.functional_area && (
                <Badge variant="outline">{profile.functional_area}</Badge>
              )}
              {profile.experience_level && (
                <Badge variant="outline">{label(profile.experience_level)}</Badge>
              )}
              {profile.total_experience_years != null && (
                <Badge variant="outline">
                  {profile.total_experience_years} yrs experience
                  {!profile.experience_years_manual_override && " (calculated)"}
                </Badge>
              )}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={startEditing}>
            <Pencil size={14} data-icon="inline-start" />
            Edit
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm"
    >
      <h2 className="text-lg font-semibold text-foreground">Edit profile</h2>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Phone">
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="Location">
          <Input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </Field>
        <Field label="Current designation">
          <Input
            value={form.current_designation}
            onChange={(e) =>
              setForm({ ...form, current_designation: e.target.value })
            }
          />
        </Field>
        <Field label="Industry">
          <Input
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
          />
        </Field>
        <Field label="Functional area">
          <Input
            value={form.functional_area}
            onChange={(e) => setForm({ ...form, functional_area: e.target.value })}
          />
        </Field>
        <Field label="Career stage">
          <Input
            value={form.career_stage}
            onChange={(e) => setForm({ ...form, career_stage: e.target.value })}
          />
        </Field>
        <Field label="Experience level">
          <select
            className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            value={form.experience_level}
            onChange={(e) => setForm({ ...form, experience_level: e.target.value })}
          >
            <option value="">Select...</option>
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {label(level)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Total experience (years)">
          <Input
            type="number"
            min="0"
            step="0.5"
            value={form.total_experience_years}
            onChange={(e) =>
              setForm({ ...form, total_experience_years: e.target.value })
            }
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {profile.experience_years_manual_override
              ? "You've set this manually, so it won't be recalculated from your experience entries."
              : "Calculated automatically from your experience entries below. Enter a value to override it."}
          </p>
          {profile.experience_years_manual_override && (
            <button
              type="button"
              onClick={handleResetExperience}
              disabled={isResetting}
              className="mt-1 text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
            >
              {isResetting ? "Recalculating..." : "Reset to auto-calculated"}
            </button>
          )}
        </Field>
      </div>

      <div className="mt-4 space-y-1.5">
        <label className="text-sm font-medium text-foreground">Summary</label>
        <textarea
          className="min-h-24 w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
        />
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-3">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={() => setIsEditing(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

// ---- Skills -----------------------------------------------------------------

function SkillsSection({
  profile,
  onUpdated,
}: {
  profile: CandidateProfileOut;
  onUpdated: (profile: CandidateProfileOut) => void;
}) {
  const [newSkill, setNewSkill] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const name = newSkill.trim();
    if (!name) return;

    setIsAdding(true);
    setError(null);
    try {
      const skill = await candidateService.addSkill({ name });
      onUpdated({ ...profile, skills: [...profile.skills, skill] });
      setNewSkill("");
    } catch (err) {
      setError(extractApiError(err, "Couldn't add that skill. Please try again."));
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (skill: SkillOut) => {
    setPendingDeleteId(skill.id);
    setError(null);
    try {
      await candidateService.deleteSkill(skill.id);
      onUpdated({
        ...profile,
        skills: profile.skills.filter((s) => s.id !== skill.id),
      });
    } catch (err) {
      setError(extractApiError(err, "Couldn't remove that skill. Please try again."));
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Award size={18} className="text-indigo-600" />
        Skills & Certifications
      </h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {profile.skills.map((skill) => (
          <Badge key={skill.id} variant="secondary" className="gap-1 pr-1">
            {skill.name}
            <button
              type="button"
              aria-label={`Remove ${skill.name}`}
              disabled={pendingDeleteId === skill.id}
              onClick={() => handleDelete(skill)}
              className="rounded-full p-0.5 hover:bg-muted disabled:opacity-50"
            >
              <X size={12} />
            </button>
          </Badge>
        ))}
        {profile.certifications.map((cert) => (
          <Badge key={cert} variant="outline">
            {cert}
          </Badge>
        ))}
        {profile.skills.length === 0 && profile.certifications.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No skills or certifications extracted yet.
          </p>
        )}
      </div>

      <form onSubmit={handleAdd} className="mt-4 flex gap-2">
        <Input
          placeholder="Add a skill (e.g. Python)"
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={isAdding || !newSkill.trim()}>
          <Plus size={14} data-icon="inline-start" />
          Add
        </Button>
      </form>

      {error && (
        <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}
    </Card>
  );
}

// ---- Experience ---------------------------------------------------------

function ExperienceSection({
  profile,
  onUpdated,
}: {
  profile: CandidateProfileOut;
  onUpdated: (profile: CandidateProfileOut) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    company: "",
    industry: "",
    start_date: "",
    end_date: "",
    is_current: false,
    description: "",
  });

  const resetForm = () =>
    setForm({
      title: "",
      company: "",
      industry: "",
      start_date: "",
      end_date: "",
      is_current: false,
      description: "",
    });

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    setIsAdding(true);
    setError(null);
    try {
      await candidateService.addExperience({
        title: form.title || null,
        company: form.company || null,
        industry: form.industry || null,
        start_date: form.start_date || null,
        end_date: form.is_current ? null : form.end_date || null,
        is_current: form.is_current,
        description: form.description || null,
      });
      // Adding experience recomputes total_experience_years server-side (unless
      // manually overridden), so refetch the whole profile rather than patching
      // experiences[] locally — otherwise the header's years badge goes stale.
      onUpdated(await candidateService.getMyProfile());
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(extractApiError(err, "Couldn't add that experience. Please try again."));
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (experience: ExperienceOut) => {
    setPendingDeleteId(experience.id);
    setError(null);
    try {
      await candidateService.deleteExperience(experience.id);
      // Same as add: deletion re-derives total_experience_years, so pull the
      // authoritative profile instead of just filtering experiences[] locally.
      onUpdated(await candidateService.getMyProfile());
    } catch (err) {
      setError(extractApiError(err, "Couldn't remove that entry. Please try again."));
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Briefcase size={18} className="text-indigo-600" />
          Experience
        </h2>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} data-icon="inline-start" />
          Add
        </Button>
      </div>

      {profile.experiences.length ? (
        <ul className="mt-4 space-y-4">
          {profile.experiences.map((exp) => (
            <li
              key={exp.id}
              className="flex items-start justify-between gap-3 border-l-2 border-indigo-100 pl-4"
            >
              <div>
                <p className="font-medium text-foreground">
                  {[exp.title, exp.company].filter(Boolean).join(" · ")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatRange(exp.start_date, exp.end_date, exp.is_current)}
                </p>
                {exp.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{exp.description}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Remove experience"
                disabled={pendingDeleteId === exp.id}
                onClick={() => handleDelete(exp)}
                className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No work experience on file yet.</p>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="mt-4 space-y-3 rounded-xl bg-muted p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Company">
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </Field>
            <Field label="Industry">
              <Input
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
            </Field>
            <Field label="Start date">
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </Field>
            {!form.is_current && (
              <Field label="End date">
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </Field>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.is_current}
              onChange={(e) => setForm({ ...form, is_current: e.target.checked })}
            />
            I currently work here
          </label>

          <Field label="Description">
            <textarea
              className="min-h-20 w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <div className="flex gap-3">
            <Button type="submit" size="sm" disabled={isAdding}>
              {isAdding ? "Saving..." : "Save experience"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}
    </Card>
  );
}

// ---- Education ------------------------------------------------------------

function EducationSection({
  profile,
  onUpdated,
}: {
  profile: CandidateProfileOut;
  onUpdated: (profile: CandidateProfileOut) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    degree: "",
    field_of_study: "",
    institution: "",
    start_date: "",
    end_date: "",
    grade: "",
  });

  const resetForm = () =>
    setForm({
      degree: "",
      field_of_study: "",
      institution: "",
      start_date: "",
      end_date: "",
      grade: "",
    });

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    setIsAdding(true);
    setError(null);
    try {
      const education = await candidateService.addEducation({
        degree: form.degree || null,
        field_of_study: form.field_of_study || null,
        institution: form.institution || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        grade: form.grade || null,
      });
      onUpdated({ ...profile, education: [...profile.education, education] });
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(extractApiError(err, "Couldn't add that education entry. Please try again."));
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (education: EducationOut) => {
    setPendingDeleteId(education.id);
    setError(null);
    try {
      await candidateService.deleteEducation(education.id);
      onUpdated({
        ...profile,
        education: profile.education.filter((e) => e.id !== education.id),
      });
    } catch (err) {
      setError(extractApiError(err, "Couldn't remove that entry. Please try again."));
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <GraduationCap size={18} className="text-indigo-600" />
          Education
        </h2>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} data-icon="inline-start" />
          Add
        </Button>
      </div>

      {profile.education.length ? (
        <ul className="mt-4 space-y-3">
          {profile.education.map((edu) => (
            <li key={edu.id} className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">
                  {[edu.degree, edu.field_of_study].filter(Boolean).join(", ")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[edu.institution, formatRange(edu.start_date, edu.end_date)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                type="button"
                aria-label="Remove education"
                disabled={pendingDeleteId === edu.id}
                onClick={() => handleDelete(edu)}
                className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No education history on file yet.</p>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="mt-4 space-y-3 rounded-xl bg-muted p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Degree">
              <Input
                value={form.degree}
                onChange={(e) => setForm({ ...form, degree: e.target.value })}
              />
            </Field>
            <Field label="Field of study">
              <Input
                value={form.field_of_study}
                onChange={(e) => setForm({ ...form, field_of_study: e.target.value })}
              />
            </Field>
            <Field label="Institution">
              <Input
                value={form.institution}
                onChange={(e) => setForm({ ...form, institution: e.target.value })}
              />
            </Field>
            <Field label="Grade">
              <Input
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
              />
            </Field>
            <Field label="Start date">
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </Field>
            <Field label="End date">
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </Field>
          </div>

          <div className="flex gap-3">
            <Button type="submit" size="sm" disabled={isAdding}>
              {isAdding ? "Saving..." : "Save education"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}
    </Card>
  );
}
