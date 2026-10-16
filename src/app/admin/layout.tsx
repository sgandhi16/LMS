"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  BarChart3,
  BookOpen,
  Users,
  Settings,
  ArrowLeft,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Analytics & KPIs",
      href: "/admin",
      icon: BarChart3,
      exact: true,
    },
    {
      label: "Sports & Curriculum",
      href: "/admin/sports",
      icon: BookOpen,
      exact: false,
    },
    {
      label: "Students & Enrollments",
      href: "/admin/students",
      icon: Users,
      exact: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-white/10 glass-panel shrink-0 flex flex-col justify-between p-4">
        <div>
          {/* Header */}
          <div className="flex items-center gap-2.5 px-3 py-4 mb-4 border-b border-white/10">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-sm text-white tracking-tight">
                ADMIN PORTAL
              </span>
              <p className="text-[10px] uppercase text-amber-400 font-bold tracking-wider">
                Full Management
              </p>
            </div>
          </div>

          {/* Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all",
                    isActive
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Back to student app button */}
        <div className="pt-4 border-t border-white/10 mt-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Switch to Student View</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-x-hidden">{children}</main>
    </div>
  );
}
