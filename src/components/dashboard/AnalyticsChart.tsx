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

interface AnalyticsChartProps {
  title: string;
  subtitle: string;
  data: { label: string; value: number }[];
  emptyMessage: string;
}

export default function AnalyticsChart({
  title,
  subtitle,
  data,
  emptyMessage,
}: AnalyticsChartProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          {title}
        </h2>

        <p className="text-sm text-slate-500">
          {subtitle}
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex h-80 items-center justify-center text-center text-sm text-slate-400">
          {emptyMessage}
        </div>
      ) : (
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

              <XAxis dataKey="label" />

              <YAxis allowDecimals={false} />

              <Tooltip />

              <Area
                type="monotone"
                dataKey="value"
                stroke="#4F46E5"
                strokeWidth={3}
                fill="url(#resumeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
