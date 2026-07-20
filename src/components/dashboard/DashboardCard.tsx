import Link from "next/link";

import { Card } from "@/components/ui/card";

export interface DashboardCardItem {
  id: string;
  name: string;
  subtitle?: string;
  badge?: string;
}

interface DashboardCardProps {
  title: string;
  viewAllHref?: string;
  items: DashboardCardItem[];
  emptyMessage: string;
  onItemClick?: (item: DashboardCardItem) => void;
}

export default function DashboardCard({
  title,
  viewAllHref,
  items,
  emptyMessage,
  onItemClick,
}: DashboardCardProps) {
  return (
    <Card>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          {title}
        </h2>

        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            View All
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={onItemClick ? () => onItemClick(item) : undefined}
              disabled={!onItemClick}
              className="flex w-full items-center justify-between rounded-xl border border-border p-4 text-left disabled:cursor-default"
            >
              <div>
                <h3 className="font-semibold text-foreground">
                  {item.name}
                </h3>

                {item.subtitle && (
                  <p className="text-sm text-muted-foreground">
                    {item.subtitle}
                  </p>
                )}
              </div>

              {item.badge && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
