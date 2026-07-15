import { ReactNode } from "react";
import { TrendingUp } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  subtitle?: string;
  icon: ReactNode;
}

export default function StatsCard({
  title,
  value,
  change,
  subtitle,
  icon,
}: StatsCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </div>

        {change && (
          <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">
            <TrendingUp size={14} />
            {change}
          </div>
        )}
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <h2 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
          {value}
        </h2>

        {subtitle && (
          <p className="mt-2 text-sm text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
