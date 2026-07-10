import ResumeUploader from "@/components/resume/ResumeUploader";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Resume</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload your resume to let the AI engine extract your profile,
          skills, and experience automatically.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ResumeUploader />
      </div>
    </div>
  );
}
