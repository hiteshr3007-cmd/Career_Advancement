import Link from "next/link";

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
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
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
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={onItemClick ? () => onItemClick(item) : undefined}
              disabled={!onItemClick}
              className="flex w-full items-center justify-between rounded-xl border border-gray-100 p-4 text-left disabled:cursor-default"
            >
              <div>
                <h3 className="font-semibold text-gray-900">
                  {item.name}
                </h3>

                {item.subtitle && (
                  <p className="text-sm text-gray-500">
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
    </div>
  );
}
