"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { day: "Mon", resumes: 18 },
  { day: "Tue", resumes: 24 },
  { day: "Wed", resumes: 21 },
  { day: "Thu", resumes: 35 },
  { day: "Fri", resumes: 42 },
  { day: "Sat", resumes: 38 },
  { day: "Sun", resumes: 46 },
];

export default function AnalyticsChart() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          Resume Analytics
        </h2>

        <p className="text-sm text-slate-500">
          AI processed resumes over the last 7 days
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient
                id="resumeGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="#4F46E5"
                  stopOpacity={0.4}
                />

                <stop
                  offset="95%"
                  stopColor="#4F46E5"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="day" />

            <YAxis />

            <Tooltip />

            <Area
              type="monotone"
              dataKey="resumes"
              stroke="#4F46E5"
              strokeWidth={3}
              fill="url(#resumeGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}