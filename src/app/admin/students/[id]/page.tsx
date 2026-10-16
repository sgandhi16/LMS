"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  User,
  Trophy,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { CircularProgress, LinearProgress } from "@/components/shared/progress-ring";

interface StudentDetailData {
  student: {
    id: string;
    name: string;
    email: string;
    role: "STUDENT" | "ADMIN";
    isActive: boolean;
    createdAt: string;
    allSports: Array<{ id: string; name: string; slug: string }>;
    sportsProgress: Array<{
      sportId: string;
      sportName: string;
      slug: string;
      accentColor: string;
      totalModules: number;
      completedModules: number;
      percent: number;
    }>;
    attempts: Array<{
      id: string;
      testTitle: string;
      moduleTitle: string;
      sportName: string;
      score: number;
      maxScore: number;
      percent: number;
      passed: boolean;
      submittedAt: string;
    }>;
  };
}

export default function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [selectedSportToEnroll, setSelectedSportToEnroll] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-student", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/students/${id}`);
      if (!res.ok) throw new Error("Failed to load student");
      return res.json() as Promise<StudentDetailData>;
    },
  });

  // Enroll / Unenroll Mutation
  const enrollmentMutation = useMutation({
    mutationFn: async ({ action, sportId }: { action: "enroll" | "unenroll"; sportId: string }) => {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, sportId }),
      });
      if (!res.ok) throw new Error("Enrollment action failed");
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast.success(vars.action === "enroll" ? "Athlete enrolled!" : "Enrollment removed");
      queryClient.invalidateQueries({ queryKey: ["admin-student", id] });
    },
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center text-slate-400">Loading athlete portfolio...</div>;
  }

  const { student } = data;
  const enrolledSportIds = new Set(student.sportsProgress.map((s) => s.sportId));
  const availableToEnroll = student.allSports.filter((s) => !enrolledSportIds.has(s.id));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students Directory</span>
        </Link>
      </div>

      {/* Header Info */}
      <div className="glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-black text-2xl">
            {student.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white">{student.name}</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {student.role}
              </span>
              {student.isActive ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  Active
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                  Deactivated
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {student.email} • ID: {student.id}
            </p>
          </div>
        </div>

        {/* Enroll in new sport */}
        {availableToEnroll.length > 0 && (
          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <select
              value={selectedSportToEnroll}
              onChange={(e) => setSelectedSportToEnroll(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
            >
              <option value="">Enroll in Sport...</option>
              {availableToEnroll.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                if (selectedSportToEnroll) {
                  enrollmentMutation.mutate({ action: "enroll", sportId: selectedSportToEnroll });
                  setSelectedSportToEnroll("");
                }
              }}
              disabled={!selectedSportToEnroll || enrollmentMutation.isPending}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors disabled:opacity-40"
            >
              Enroll
            </button>
          </div>
        )}
      </div>

      {/* Per-Sport Progress Cards */}
      <section className="space-y-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span>Curriculum Progress Per Sport</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {student.sportsProgress.map((sport) => (
            <div
              key={sport.sportId}
              className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{sport.sportName}</h3>
                    <span className="text-xs text-slate-400">
                      {sport.completedModules} of {sport.totalModules} modules completed
                    </span>
                  </div>

                  <CircularProgress
                    progress={sport.percent}
                    size={56}
                    strokeWidth={5}
                    color={sport.accentColor}
                  />
                </div>

                <LinearProgress
                  progress={sport.percent}
                  color={sport.accentColor}
                  height={6}
                />
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-xs">
                <span className="font-bold text-white">{sport.percent}% Mastered</span>
                <button
                  onClick={() => {
                    if (confirm(`Remove enrollment in ${sport.sportName}?`)) {
                      enrollmentMutation.mutate({ action: "unenroll", sportId: sport.sportId });
                    }
                  }}
                  className="text-red-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Unenroll</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Assessment Attempts History */}
      <section className="space-y-4">
        <h2 className="text-lg font-black text-white">Assessment Attempts History</h2>

        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-white/10 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Assessment</th>
                  <th className="px-6 py-3.5">Sport</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Score</th>
                  <th className="px-6 py-3.5">Percentage</th>
                  <th className="px-6 py-3.5">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {student.attempts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-slate-400">
                      No attempts recorded for this athlete.
                    </td>
                  </tr>
                ) : (
                  student.attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-3.5 font-bold text-white">
                        {att.testTitle}
                      </td>
                      <td className="px-6 py-3.5 text-slate-300">
                        {att.sportName}
                      </td>
                      <td className="px-6 py-3.5 text-slate-400">
                        {new Date(att.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-200">
                        {att.score} / {att.maxScore}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-white">
                        {att.percent}%
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            att.passed
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {att.passed ? "Pass" : "Fail"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
