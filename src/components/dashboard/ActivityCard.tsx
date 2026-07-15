import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export interface InsightItem {
  id: string;
  icon: ReactNode;
  title: string;
  description: ReactNode;
}

interface ActivityCardProps {
  title: string;
  badgeLabel: string;
  insights: InsightItem[];
  emptyMessage: string;
}

export default function ActivityCard({
  title,
  badgeLabel,
  insights,
  emptyMessage,
}: ActivityCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">
          {title}
        </h2>

        <Badge variant="secondary">
          {badgeLabel}
        </Badge>
      </div>

      {insights.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="space-y-5">
          {insights.map((insight) => (
            <div key={insight.id} className="flex items-start gap-4">
              <div className="mt-1">{insight.icon}</div>

              <div>
                <p className="font-semibold">
                  {insight.title}
                </p>

                <p className="text-sm text-slate-500">
                  {insight.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
