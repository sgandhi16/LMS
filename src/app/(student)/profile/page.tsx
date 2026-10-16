"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  Award,
  CheckCircle2,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  FileCheck2,
  BarChart2,
} from "lucide-react";
import { CircularProgress } from "@/components/shared/progress-ring";

interface ProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
    createdAt: string;
  };
  stats: {
    enrolledSportsCount: number;
    totalCompletedModules: number;
    totalAttempts: number;
    passedTests: number;
    averageScore: number;
  };
  sportsProgress: Array<{
    sportId: string;
    sportName: string;
    slug: string;
    accentColor: string;
    totalModules: number;
    completedModules: number;
    percent: number;
  }>;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
    unlockedAt: string | null;
  }>;
  certificates: Array<{
    id: string;
    sportName: string;
    sportSlug: string;
    issuedTo: string;
    issuedAt: string;
    verificationCode: string;
  }>;
}

interface AttemptItem {
  id: string;
  testTitle: string;
  moduleTitle: string;
  sportName: string;
  sportSlug: string;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  passPercent: number;
  submittedAt: string;
}

export default function ProfilePage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["student-profile"],
    queryFn: async () => {
      const res = await fetch("/api/student/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json() as Promise<ProfileData>;
    },
  });

  const { data: attemptsData } = useQuery({
    queryKey: ["student-attempts"],
    queryFn: async () => {
      const res = await fetch("/api/student/attempts");
      if (!res.ok) throw new Error("Failed to load attempts");
      return res.json() as Promise<{ attempts: AttemptItem[] }>;
    },
  });

  if (isLoading || !profile) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-6 animate-pulse">
        <div className="h-44 rounded-3xl bg-slate-900/60" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 rounded-2xl bg-slate-900/60" />
          <div className="h-44 rounded-2xl bg-slate-900/60" />
          <div className="h-44 rounded-2xl bg-slate-900/60" />
        </div>
      </div>
    );
  }

  const attempts = attemptsData?.attempts || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Profile Header */}
      <div className="glass-panel rounded-3xl p-8 relative overflow-hidden shadow-2xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-400 p-0.5 shadow-xl">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl font-black text-white">
              {profile.user.name.charAt(0)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white">
                {profile.user.name}
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {profile.user.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {profile.user.email} • Enrolled since{" "}
              {new Date(profile.user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Aggregate KPI Badges */}
        <div className="grid grid-cols-3 gap-3 self-stretch md:self-auto">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-center">
            <span className="text-xs text-slate-400 block">Completed</span>
            <span className="text-xl font-black text-white">
              {profile.stats.totalCompletedModules}
            </span>
            <span className="text-[10px] text-slate-500 block">modules</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-center">
            <span className="text-xs text-slate-400 block">Passed Tests</span>
            <span className="text-xl font-black text-emerald-400">
              {profile.stats.passedTests}
            </span>
            <span className="text-[10px] text-slate-500 block">assessments</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-center">
            <span className="text-xs text-slate-400 block">Average</span>
            <span className="text-xl font-black text-blue-400">
              {profile.stats.averageScore}%
            </span>
            <span className="text-[10px] text-slate-500 block">accuracy</span>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-black text-white tracking-tight">
            Athletic Badges & Milestones
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {profile.badges.map((badge) => (
            <div
              key={badge.id}
              className={`glass-panel rounded-2xl p-5 border text-center transition-all ${
                badge.unlocked
                  ? "border-amber-500/30 bg-amber-500/5 glow-primary"
                  : "border-white/5 opacity-40 bg-slate-950/40"
              }`}
            >
              <span className="text-4xl block mb-2">{badge.icon}</span>
              <h3 className="text-sm font-black text-white mb-1">
                {badge.name}
              </h3>
              <p className="text-[11px] text-slate-400 leading-tight mb-3">
                {badge.description}
              </p>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  badge.unlocked
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {badge.unlocked ? "Unlocked" : "Locked"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Certificates Section (Official Verification) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-black text-white tracking-tight">
            Verified Academy Certificates
          </h2>
        </div>

        {profile.certificates.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6 text-center border border-white/5">
            <FileCheck2 className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400">
              Complete all modules and assessments of any sport to earn an official certified diploma.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.certificates.map((cert) => (
              <div
                key={cert.id}
                className="glass-panel rounded-2xl p-6 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-slate-900/60 shadow-xl"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block mb-1">
                      Certified Master Diploma
                    </span>
                    <h3 className="text-lg font-black text-white">
                      {cert.sportName} Mastery
                    </h3>
                  </div>
                  <Trophy className="w-6 h-6 text-amber-400" />
                </div>

                <div className="space-y-1 text-xs text-slate-300 mb-4">
                  <p>Awarded to: <strong className="text-white">{cert.issuedTo}</strong></p>
                  <p>Issued: <strong className="text-white">{new Date(cert.issuedAt).toLocaleDateString()}</strong></p>
                  <p className="font-mono text-[11px] text-emerald-400 font-bold">
                    ID: {cert.verificationCode}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Credential
                  </span>
                  <span className="text-slate-400">APEX Academy</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Full Attempt History Table */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-black text-white tracking-tight">
            Full Assessment Attempt History
          </h2>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-white/10 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Assessment Title</th>
                  <th className="px-6 py-3.5">Sport</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Score</th>
                  <th className="px-6 py-3.5">Percentage</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {attempts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No assessment attempts recorded.
                    </td>
                  </tr>
                ) : (
                  attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-bold text-white">
                        {att.testTitle}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {att.sportName}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(att.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-200">
                        {att.score} / {att.maxScore}
                      </td>
                      <td className="px-6 py-4 font-black text-white">
                        {att.percent}%
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase ${
                            att.passed
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
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
