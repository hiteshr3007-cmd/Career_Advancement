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
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account and preferences.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Account</h2>
        <dl className="mt-4 divide-y divide-slate-100">
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-slate-500">Full name</dt>
            <dd className="text-sm font-medium text-slate-900">{user?.full_name ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-slate-500">Email</dt>
            <dd className="text-sm font-medium text-slate-900">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-slate-500">Role</dt>
            <dd className="text-sm font-medium text-slate-900">{user?.role ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Theme</p>
            <p className="text-sm text-slate-500">
              {theme === "dark" ? "Dark mode is on" : "Light mode is on"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
            {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>
      </section>
    </div>
  );
}
