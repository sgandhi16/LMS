"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Trophy,
  LayoutDashboard,
  User,
  Shield,
  BookOpen,
  Search,
  LogOut,
  X,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  const navigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg mx-4 rounded-xl glass-panel shadow-2xl border border-white/10 overflow-hidden">
        <Command label="Global Command Palette">
          <div className="flex items-center px-4 border-b border-white/10">
            <Search className="w-5 h-5 text-slate-400 mr-2" />
            <Command.Input
              placeholder="Search sports, modules, or pages... (ESC to close)"
              className="w-full py-4 text-sm bg-transparent outline-none text-white placeholder-slate-500"
              autoFocus
            />
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-1">
            <Command.Empty className="py-6 text-center text-sm text-slate-400">
              No matching results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="text-xs font-semibold text-slate-500 px-2 py-1">
              <Command.Item
                onSelect={() => navigate("/dashboard")}
                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                <span>Student Dashboard</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigate("/profile")}
                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <User className="w-4 h-4 text-emerald-400" />
                <span>My Profile & Badges</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Sports" className="text-xs font-semibold text-slate-500 px-2 py-1">
              <Command.Item
                onSelect={() => navigate("/sports/boxing")}
                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <span className="text-base">🥊</span>
                <span>Boxing (13 Modules)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigate("/sports/football")}
                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <span className="text-base">⚽</span>
                <span>Football (6 Modules)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigate("/sports/tennis")}
                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <span className="text-base">🎾</span>
                <span>Tennis (6 Modules)</span>
              </Command.Item>
            </Command.Group>

            {isAdmin && (
              <Command.Group heading="Admin Area" className="text-xs font-semibold text-slate-500 px-2 py-1">
                <Command.Item
                  onSelect={() => navigate("/admin")}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Admin Analytics Dashboard</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => navigate("/admin/sports")}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Manage Sports & Modules</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => navigate("/admin/students")}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Student Progress & Enrollments</span>
                </Command.Item>
              </Command.Group>
            )}

            <Command.Group heading="Account" className="text-xs font-semibold text-slate-500 px-2 py-1">
              <Command.Item
                onSelect={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-3 px-3 py-2 text-sm text-red-400 rounded-lg hover:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="px-4 py-2 border-t border-white/5 bg-slate-900/40 flex justify-between items-center text-xs text-slate-500">
            <span>Tip: Use ↑↓ arrows to navigate, Enter to select</span>
            <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-slate-400">ESC</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
