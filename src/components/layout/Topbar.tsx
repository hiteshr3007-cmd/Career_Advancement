"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Moon, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/useNotifications";
import { isViewerRole } from "@/lib/roles";
import { useAuth } from "@/store/auth-context";
import { NotificationTone } from "@/types/notification";

interface TopbarProps {
  onMenuClick: () => void;
}

function timeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const TONE_DOT_CLASS: Record<NotificationTone, string> = {
  info: "bg-indigo-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
};

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { notifications, isLoading: isLoadingNotifications } = useNotifications();

  const displayName = user?.full_name ?? "Account";
  const firstName = displayName.split(" ")[0];
  const initial = displayName.charAt(0).toUpperCase();
  // The candidate directory (and its skill search) is a recruiter/HR/employer/
  // admin tool — candidates have no equivalent target, so the search box is
  // replaced entirely for them rather than shown disabled.
  const canSearch = isViewerRole(user?.role);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const handleNotificationClick = (href?: string) => {
    if (href) router.push(href);
  };

  const submitSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/candidates?skill=${encodeURIComponent(trimmed)}`);
  };

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    submitSearch();
  };

  // The base-ui Input primitive doesn't reliably trigger native implicit
  // form submission on Enter in a button-less form, so submit explicitly.
  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitSearch();
    }
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

      {canSearch ? (
        <form
          onSubmit={handleSearchSubmit}
          className="relative min-w-0 flex-1 max-w-md"
        >
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <Input
            aria-label="Search candidates by skill"
            placeholder="Search candidates by skill..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-10"
          />
        </form>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2 text-slate-400">
          <Sparkles size={16} className="shrink-0 text-indigo-400" />
          <p className="truncate text-sm">
            <span className="font-medium text-slate-600">
              {timeOfDayGreeting()}, {firstName}
            </span>
            <span className="hidden sm:inline"> — let&apos;s keep your career moving.</span>
          </p>
        </div>
      )}

      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Notifications"
            className="relative text-slate-500 outline-none transition hover:text-slate-900"
          >
            <Bell size={21} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white">
                {notifications.length}
              </span>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isLoadingNotifications ? (
                <p className="px-3 py-4 text-sm text-slate-500">Loading...</p>
              ) : notifications.length === 0 ? (
                <p className="px-3 py-4 text-sm text-slate-500">You&apos;re all caught up.</p>
              ) : (
                notifications.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => handleNotificationClick(item.href)}
                    className="items-start"
                  >
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE_DOT_CLASS[item.tone]}`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{item.title}</p>
                      {item.description && (
                        <p className="mt-0.5 text-xs whitespace-normal text-slate-500">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

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
