import { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="rounded-3xl bg-white p-8 shadow-xl">
      <div className="mb-6 text-center">
        <span className="text-lg font-semibold text-slate-900">
          Career Advancement
        </span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      {children}

      {footer && (
        <div className="mt-6 text-center text-sm text-slate-500">
          {footer}
        </div>
      )}
    </div>
  );
}
