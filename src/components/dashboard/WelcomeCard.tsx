import { Upload, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WelcomeCard() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-indigo-900 to-slate-900 p-8 text-white">

      <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />

      <div className="relative z-10">

        <div className="mb-6 flex items-center justify-between">

          <div>

            <p className="text-sm text-indigo-200">
              {today}
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Welcome back, Hitesh 👋
            </h1>

            <p className="mt-3 max-w-xl text-indigo-100">
              Your AI Command Center analyzed
              <span className="font-semibold text-white">
                {" "}24 resumes
              </span>
              {" "}today and identified
              <span className="font-semibold text-white">
                {" "}18 high-potential candidates.
              </span>
            </p>

          </div>

          <div className="hidden rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-300 lg:flex">
            🟢 AI Engine Online
          </div>

        </div>

        <div className="flex flex-wrap gap-4">

          <Button className="gap-2 bg-white text-slate-900 hover:bg-slate-100">
            <Upload size={18} />
            Upload Resume
          </Button>

          <Button
            variant="secondary"
            className="gap-2 bg-white/10 text-white hover:bg-white/20"
          >
            <Users size={18} />
            View Candidates
          </Button>

          <Button
            variant="secondary"
            className="gap-2 bg-white/10 text-white hover:bg-white/20"
          >
            <Sparkles size={18} />
            Generate Roadmap
          </Button>

        </div>

      </div>

    </section>
  );
}