"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { useAuth } from "@/store/auth-context";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const { permissionsChanged, dismissPermissionsChanged, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 p-6 bg-gray-50">
          {permissionsChanged && (
            <div className="mb-4 flex items-center justify-between gap-4 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              <span>
                Your account permissions changed{user?.role ? ` — you're now a ${user.role}` : ""}.
                This page has been updated to reflect it.
              </span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={dismissPermissionsChanged}
                className="shrink-0 rounded-full p-1 text-amber-600 hover:bg-amber-100"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
