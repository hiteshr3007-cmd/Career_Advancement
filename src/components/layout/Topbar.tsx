"use client";

import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Moon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/store/auth-context";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const displayName = user?.full_name ?? "Account";
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={onMenuClick}
        className="shrink-0 text-slate-500 transition hover:text-slate-900 md:hidden"
      >
        <Menu size={22} />
      </button>

      <div className="relative min-w-0 flex-1 max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <Input
          aria-label="Search candidates, skills, jobs"
          placeholder="Search candidates, skills, jobs..."
          disabled
          title="Search is coming soon"
          className="pl-10 disabled:opacity-60"
        />
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        <button
          type="button"
          aria-label="Notifications"
          disabled
          title="Notifications are coming soon"
          className="text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Bell size={21} />
        </button>

        <button
          type="button"
          aria-label="Toggle theme"
          disabled
          title="Theme toggle is coming soon"
          className="text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Moon size={21} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-full outline-none">
            <Avatar>
              <AvatarFallback className="bg-indigo-600 text-white">
                {initial}
              </AvatarFallback>
            </Avatar>

            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-slate-900">
                {displayName}
              </p>

              <p className="text-xs text-slate-500">
                {user?.role ?? "Candidate"}
              </p>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
