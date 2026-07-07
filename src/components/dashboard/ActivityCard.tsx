import { Badge } from "@/components/ui/badge";
import {
  Brain,
  TrendingUp,
  Star,
  TriangleAlert,
} from "lucide-react";

export default function ActivityCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">
          AI Insights
        </h2>

        <Badge variant="secondary">
          Live
        </Badge>
      </div>

      <div className="space-y-5">

        <div className="flex items-start gap-4">
          <Brain className="mt-1 text-indigo-600" size={20} />

          <div>
            <p className="font-semibold">
              Top Skill Gap
            </p>

            <p className="text-sm text-slate-500">
              56% of candidates lack experience in
              <span className="font-medium text-indigo-600">
                {" "}System Design
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <Star className="mt-1 text-emerald-500" size={20} />

          <div>
            <p className="font-semibold">
              Best Candidate Today
            </p>

            <p className="text-sm text-slate-500">
              Rahul Sharma achieved a
              <span className="font-medium text-emerald-600">
                {" "}92% AI Match
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <TrendingUp className="mt-1 text-sky-500" size={20} />

          <div>
            <p className="font-semibold">
              Hiring Trend
            </p>

            <p className="text-sm text-slate-500">
              Demand for AI Engineers has increased
              <span className="font-medium text-sky-600">
                {" "}24%
              </span>
              {" "}this month.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <TriangleAlert className="mt-1 text-amber-500" size={20} />

          <div>
            <p className="font-semibold">
              Resume Quality
            </p>

            <p className="text-sm text-slate-500">
              32% of uploaded resumes need better formatting.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}