"use client";

import { Moon, Sun } from "lucide-react";

import { useAuth } from "@/store/auth-context";
import { useTheme } from "@/store/theme-context";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-card-foreground">Account</h2>
        <dl className="mt-4 divide-y divide-border">
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-muted-foreground">Full name</dt>
            <dd className="text-sm font-medium text-card-foreground">{user?.full_name ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-muted-foreground">Email</dt>
            <dd className="text-sm font-medium text-card-foreground">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-muted-foreground">Role</dt>
            <dd className="text-sm font-medium text-card-foreground">{user?.role ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-card-foreground">Appearance</h2>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-card-foreground">Theme</p>
            <p className="text-sm text-muted-foreground">
              {theme === "dark" ? "Dark mode is on" : "Light mode is on"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm font-medium text-card-foreground transition hover:bg-accent"
          >
            {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
            {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>
      </section>
    </div>
  );
}
