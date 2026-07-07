"use client";

import { Bell, Moon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <div className="relative w-full max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <Input
          placeholder="Search candidates, skills, jobs..."
          className="pl-10"
        />
      </div>

      <div className="flex items-center gap-5">
        <button className="text-slate-500 transition hover:text-slate-900">
          <Bell size={21} />
        </button>

        <button className="text-slate-500 transition hover:text-slate-900">
          <Moon size={21} />
        </button>

        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-indigo-600 text-white">
              H
            </AvatarFallback>
          </Avatar>

          <div className="hidden md:block">
            <p className="text-sm font-semibold text-slate-900">
              Hitesh
            </p>

            <p className="text-xs text-slate-500">
              Administrator
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}