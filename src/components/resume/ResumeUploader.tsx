"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, UploadCloud, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import resumeService from "@/services/resume.service";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx";
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function ResumeUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Only PDF, DOC, or DOCX files are supported.";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return "File is too large. Maximum size is 10MB.";
    }
    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);

    if (validationError) {
      setSelectedFile(null);
      setStatus("error");
      setMessage(validationError);
      return;
    }

    setSelectedFile(file);
    setStatus("idle");
    setMessage(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setStatus("uploading");
    setMessage(null);

    try {
      const response = await resumeService.uploadResume(selectedFile);
      setStatus("success");
      setMessage(response.message ?? "Resume uploaded successfully.");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Upload failed. Please try again."
      );
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setStatus("idle");
    setMessage(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
          isDragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {selectedFile ? (
          <FileText className="text-indigo-600" size={36} />
        ) : (
          <UploadCloud className="text-slate-400" size={36} />
        )}

        {selectedFile ? (
          <div>
            <p className="font-medium text-slate-900">{selectedFile.name}</p>
            <p className="text-sm text-slate-500">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div>
            <p className="font-medium text-slate-900">
              Drag & drop your resume here, or click to browse
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Supports PDF, DOC, DOCX up to 10MB
            </p>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
            status === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-600"
          }`}
        >
          {status === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <XCircle size={16} />
          )}
          {message}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || status === "uploading"}
        >
          {status === "uploading" ? "Uploading..." : "Upload Resume"}
        </Button>

        {selectedFile && status !== "uploading" && (
          <Button variant="outline" onClick={reset}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
