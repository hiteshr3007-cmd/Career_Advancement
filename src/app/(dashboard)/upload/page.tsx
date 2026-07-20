"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, RefreshCw, Trash2 } from "lucide-react";

import AccessRestricted from "@/components/layout/AccessRestricted";
import ResumeUploader from "@/components/resume/ResumeUploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { extractApiError } from "@/lib/api";
import { isCandidate } from "@/lib/roles";
import resumeService from "@/services/resume.service";
import { useAuth } from "@/store/auth-context";
import { Resume } from "@/types/resume";

const POLL_INTERVAL_MS = 2000;

const STATUS_COPY: Record<Resume["parsing_status"], { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending", variant: "outline" },
  processing: { label: "Processing", variant: "outline" },
  completed: { label: "Parsed", variant: "secondary" },
  failed: { label: "Parsing failed", variant: "destructive" },
};

export default function UploadPage() {
  const { user } = useAuth();

  if (!isCandidate(user?.role)) {
    return (
      <AccessRestricted message="Resume upload is only available to candidate accounts." />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Resumes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your resume to let the AI engine extract your profile,
          skills, and experience automatically.
        </p>
      </div>

      <ResumeManager />
    </div>
  );
}

function ResumeManager() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadResumes = async () => {
    try {
      const data = await resumeService.listResumes();
      setResumes(data);
      setError(null);
    } catch (err) {
      setError(extractApiError(err, "Couldn't load your resumes. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hasInFlight = resumes.some(
      (r) => r.parsing_status === "pending" || r.parsing_status === "processing"
    );

    if (hasInFlight && !pollRef.current) {
      pollRef.current = setInterval(loadResumes, POLL_INTERVAL_MS);
    } else if (!hasInFlight && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumes]);

  return (
    <div className="space-y-6">
      <Card>
        <ResumeUploader onUploaded={loadResumes} />
      </Card>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="text-lg font-semibold text-foreground">Uploaded versions</h2>
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading your resumes...</p>
        ) : resumes.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="mx-auto text-muted-foreground" size={32} />
            <p className="mt-2 text-sm text-muted-foreground">
              You haven't uploaded a resume yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {resumes.map((resume) => (
              <ResumeRow
                key={resume.id}
                resume={resume}
                onChanged={loadResumes}
                onDeleted={() => setResumes((prev) => prev.filter((r) => r.id !== resume.id))}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ResumeRow({
  resume,
  onChanged,
  onDeleted,
}: {
  resume: Resume;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReparsing, setIsReparsing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const status = STATUS_COPY[resume.parsing_status];
  const isBusy = resume.parsing_status === "pending" || resume.parsing_status === "processing";

  const handleDownload = async () => {
    setIsDownloading(true);
    setRowError(null);
    try {
      await resumeService.downloadResume(resume.id, resume.original_file_name);
    } catch (err) {
      setRowError(extractApiError(err, "Couldn't download this resume."));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReparse = async () => {
    setIsReparsing(true);
    setRowError(null);
    try {
      await resumeService.reparseResume(resume.id);
      onChanged();
    } catch (err) {
      setRowError(extractApiError(err, "Couldn't reparse this resume."));
    } finally {
      setIsReparsing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${resume.original_file_name} (version ${resume.version})?`)) {
      return;
    }
    setIsDeleting(true);
    setRowError(null);
    try {
      await resumeService.deleteResume(resume.id);
      onDeleted();
    } catch (err) {
      setRowError(extractApiError(err, "Couldn't delete this resume."));
      setIsDeleting(false);
    }
  };

  return (
    <li className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-foreground">{resume.original_file_name}</p>
          <Badge variant="outline">v{resume.version}</Badge>
          {resume.is_active && <Badge variant="secondary">Active</Badge>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{new Date(resume.created_at).toLocaleString()}</span>
          <Badge variant={status.variant}>
            {isBusy && <Loader2 size={12} className="mr-1 animate-spin" data-icon="inline-start" />}
            {status.label}
          </Badge>
          {resume.parsing_status === "failed" && resume.parsing_error && (
            <span className="text-rose-600">{resume.parsing_error}</span>
          )}
        </div>
        {rowError && <p className="mt-1 text-xs text-rose-600">{rowError}</p>}
      </div>

      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDownloading}
          onClick={handleDownload}
        >
          <Download size={14} data-icon="inline-start" />
          {isDownloading ? "Downloading..." : "Download"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isReparsing || isBusy}
          onClick={handleReparse}
        >
          <RefreshCw size={14} data-icon="inline-start" />
          Reparse
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isDeleting}
          onClick={handleDelete}
        >
          <Trash2 size={14} data-icon="inline-start" />
          Delete
        </Button>
      </div>
    </li>
  );
}
