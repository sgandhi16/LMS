"use client";

import Link from "next/navigation";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Trophy,
  LayoutDashboard,
  User,
  Shield,
  LogOut,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <a href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-amber-400 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                APEX
              </span>
              <span className="font-bold text-lg text-blue-500 ml-1">LMS</span>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium -mt-1">
                Sports Academy
              </p>
            </div>
          </a>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-1">
            <a
              href="/dashboard"
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith("/dashboard") || pathname.startsWith("/sports")
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Training</span>
            </a>

            <a
              href="/profile"
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith("/profile")
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <User className="w-4 h-4" />
              <span>Badges & History</span>
            </a>

            {isAdmin && (
              <a
                href="/admin"
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "text-amber-400 hover:text-amber-200 hover:bg-amber-500/10"
                )}
              >
                <Shield className="w-4 h-4" />
                <span>Admin Portal</span>
              </a>
            )}
          </nav>
        </div>

        {/* Right side: search button, user info, logout */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const event = new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                bubbles: true,
              });
              document.dispatchEvent(event);
            }}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-white/10 text-xs text-slate-400 hover:text-white hover:border-white/20 transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">
              ⌘K
            </kbd>
          </button>

          {session?.user && (
            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white leading-tight">
                  {session.user.name}
                </p>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {session.user.role}
                </span>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Log out"
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
