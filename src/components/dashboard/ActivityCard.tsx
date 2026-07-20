import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
    <Card>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          {title}
        </h2>

        <Badge variant="secondary">
          {badgeLabel}
        </Badge>
      </div>

      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-5">
          {insights.map((insight) => (
            <div key={insight.id} className="flex items-start gap-4">
              <div className="mt-1">{insight.icon}</div>

              <div>
                <p className="font-semibold">
                  {insight.title}
                </p>

                <p className="text-sm text-muted-foreground">
                  {insight.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
