import { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface WelcomeAction {
  label: string;
  icon: ReactNode;
  href?: string;
  disabled?: boolean;
  disabledReason?: string;
}

interface WelcomeCardProps {
  name?: string;
  subtitle: ReactNode;
  actions: WelcomeAction[];
}

export default function WelcomeCard({ name, subtitle, actions }: WelcomeCardProps) {
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
              Welcome back{name ? `, ${name}` : ""} 👋
            </h1>

            <p className="mt-3 max-w-xl text-indigo-100">
              {subtitle}
            </p>

          </div>

        </div>

        <div className="flex flex-wrap gap-4">
          {actions.map((action) =>
            action.disabled ? (
              <span
                key={action.label}
                title={action.disabledReason ?? "Coming soon"}
                className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-white/40"
              >
                {action.icon}
                {action.label}
              </span>
            ) : (
              <Button
                key={action.label}
                render={<Link href={action.href ?? "#"} />}
                nativeButton={false}
                variant="secondary"
                className="gap-2 bg-white/10 text-white hover:bg-white/20"
              >
                {action.icon}
                {action.label}
              </Button>
            )
          )}
        </div>

      </div>

    </section>
  );
}
