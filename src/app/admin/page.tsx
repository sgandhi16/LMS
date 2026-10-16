"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Trophy,
  CheckCircle2,
  TrendingUp,
  Download,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { LinearProgress } from "@/components/shared/progress-ring";

interface AnalyticsData {
  kpis: {
    totalStudents: number;
    totalEnrollments: number;
    totalAttempts: number;
    overallPassRate: number;
  };
  sportsAnalytics: Array<{
    id: string;
    name: string;
    slug: string;
    accentColor: string;
    totalModules: number;
    enrolledCount: number;
    completedProgressCount: number;
    completionRate: number;
    avgScore: number;
    attemptsCount: number;
  }>;
  hardestQuestions: Array<{
    id: string;
    prompt: string;
    type: string;
    sportName: string;
    moduleTitle: string;
    totalResponses: number;
    correctResponses: number;
    correctRate: number;
  }>;
  moduleCompletion: Array<{
    id: string;
    title: string;
    sportName: string;
    order: number;
    completedStudents: number;
  }>;
}

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json() as Promise<AnalyticsData>;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-28 rounded-2xl bg-slate-900/60" />
          <div className="h-28 rounded-2xl bg-slate-900/60" />
          <div className="h-28 rounded-2xl bg-slate-900/60" />
          <div className="h-28 rounded-2xl bg-slate-900/60" />
        </div>
        <div className="h-80 rounded-2xl bg-slate-900/60" />
      </div>
    );
  }

  const { kpis, sportsAnalytics, hardestQuestions, moduleCompletion } = data;

  // Chart data for Sport Completion Rates
  const chartData = sportsAnalytics.map((s) => ({
    name: s.name,
    completionRate: s.completionRate,
    avgScore: s.avgScore,
    color: s.accentColor,
  }));

  return (
    <div className="space-y-8">
      {/* Page Header with CSV Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            Analytics & Academy KPIs
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Real-time curriculum completion rates, assessment metrics, and question analytics
          </p>
        </div>

        <a
          href="/api/admin/analytics/export"
          download
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-950/30 transition-all shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export Progress CSV</span>
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel rounded-2xl p-6 border border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Students
            </span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white">{kpis.totalStudents}</div>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">
            Active Athletes
          </span>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Enrollments
            </span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white">{kpis.totalEnrollments}</div>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            Across 3 Sports
          </span>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Assessments Taken
            </span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">{kpis.totalAttempts}</div>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            Server-scored submissions
          </span>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Overall Pass Rate
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white">{kpis.overallPassRate}%</div>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">
            Passed standard threshold
          </span>
        </div>
      </div>

      {/* Completion Rates Chart & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recharts Bar Chart */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10">
          <h2 className="text-base font-bold text-white mb-4">
            Curriculum Completion Rates (%)
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="completionRate" name="Completion Rate %" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sport Breakdown Details */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
          <h2 className="text-base font-bold text-white">
            Curriculum Performance Breakdown
          </h2>

          <div className="space-y-4">
            {sportsAnalytics.map((sport) => (
              <div
                key={sport.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2"
              >
                <div className="flex justify-between items-center text-sm font-bold text-white">
                  <span>{sport.name}</span>
                  <span className="font-mono text-xs text-slate-300">
                    {sport.completionRate}% completion
                  </span>
                </div>

                <LinearProgress
                  progress={sport.completionRate}
                  color={sport.accentColor}
                  height={6}
                />

                <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                  <span>{sport.enrolledCount} Enrolled Athletes</span>
                  <span>Avg Test Score: <strong className="text-white">{sport.avgScore}%</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hardest Questions Table (Lowest Correct Rate) */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Hardest Questions (Lowest Correct Rate)
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Identifies learning gaps for coaching intervention
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-white/10 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Question Prompt</th>
                <th className="px-4 py-3">Sport / Module</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Responses</th>
                <th className="px-4 py-3">Correct Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {hardestQuestions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No student submissions recorded yet.
                  </td>
                </tr>
              ) : (
                hardestQuestions.map((q) => (
                  <tr key={q.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5 font-medium text-white max-w-sm truncate">
                      {q.prompt}
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      {q.sportName} • {q.moduleTitle}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 text-[10px] uppercase font-bold">
                        {q.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      {q.totalResponses}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                          q.correctRate < 50
                            ? "bg-red-500/20 text-red-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {q.correctRate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
