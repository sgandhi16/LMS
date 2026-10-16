"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Trophy,
  Play,
  ArrowRight,
  Flame,
  Award,
  CheckCircle2,
  BookOpen,
  Plus,
  Compass,
} from "lucide-react";
import { CircularProgress, LinearProgress } from "@/components/shared/progress-ring";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface SportProgressItem {
  sportId: string;
  sportName: string;
  slug: string;
  accentColor: string;
  coverImageUrl: string | null;
  totalModules: number;
  completedModules: number;
  percent: number;
  lastWatchedAt: string | null;
  currentModuleId: string | null;
  currentModuleTitle: string | null;
}

interface AvailableSport {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  accentColor: string;
  totalModules: number;
}

interface RecentScore {
  id: string;
  testTitle: string;
  moduleTitle: string;
  sportName: string;
  sportSlug: string;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  submittedAt: string;
}

export default function StudentDashboard() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["student-sports"],
    queryFn: async () => {
      const res = await fetch("/api/student/sports");
      if (!res.ok) throw new Error("Failed to load dashboard data");
      return res.json() as Promise<{
        enrolled: SportProgressItem[];
        available: AvailableSport[];
        recentAttempts: RecentScore[];
      }>;
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (sportId: string) => {
      const res = await fetch("/api/student/sports/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sportId }),
      });
      if (!res.ok) throw new Error("Enrollment failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Enrolled in sport successfully! Added to your training.");
      queryClient.invalidateQueries({ queryKey: ["student-sports"] });
    },
    onError: () => {
      toast.error("Could not enroll in sport. Please try again.");
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
        <div className="h-44 rounded-3xl bg-slate-900/60 border border-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 rounded-2xl bg-slate-900/60 border border-white/5" />
          <div className="h-64 rounded-2xl bg-slate-900/60 border border-white/5" />
          <div className="h-64 rounded-2xl bg-slate-900/60 border border-white/5" />
        </div>
      </div>
    );
  }

  const enrolled = data?.enrolled || [];
  const available = data?.available || [];
  const recentAttempts = data?.recentAttempts || [];

  // Find most recent active sport / module for "Continue where you left off"
  const mostRecentSport = enrolled.find((s) => s.currentModuleId !== null) || enrolled[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Hero Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl p-8 md:p-10 overflow-hidden glass-panel border border-white/10 shadow-2xl bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-slate-950"
      >
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5" />
                <span>5-Day Training Streak</span>
              </span>
              <span className="text-xs text-slate-400">• Active Athlete</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Welcome back, {session?.user?.name || "Athlete"}!
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-xl">
              Track your athletic progression, watch certified technique modules, and complete instant assessments.
            </p>
          </div>

          {/* Quick Continue Action */}
          {mostRecentSport && mostRecentSport.currentModuleId && (
            <a
              href={`/modules/${mostRecentSport.currentModuleId}`}
              className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-900/40 hover:brightness-110 transition-all group shrink-0"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Play className="w-5 h-5 fill-white" />
              </div>
              <div className="text-left">
                <span className="block text-[11px] uppercase tracking-wider text-blue-200">
                  Continue where you left off
                </span>
                <span className="text-base font-extrabold line-clamp-1">
                  {mostRecentSport.currentModuleTitle || "Next Module"}
                </span>
              </div>
            </a>
          )}
        </div>
      </motion.div>

      {/* Enrolled Sports Progress Cards */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              My Active Training
            </h2>
            <p className="text-xs md:text-sm text-slate-400">
              Per-sport curriculum mastery and verified test scores
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {enrolled.length} Enrolled Sport{enrolled.length !== 1 ? "s" : ""}
          </span>
        </div>

        {enrolled.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center border border-white/10">
            <BookOpen className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">
              No Sports Enrolled Yet
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Explore available sports below to start your athletic training.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolled.map((sport) => {
              const isBoxing = sport.slug === "boxing";
              const isFootball = sport.slug === "football";
              const isTennis = sport.slug === "tennis";

              const sportIcon = isBoxing ? "🥊" : isFootball ? "⚽" : isTennis ? "🎾" : "🏅";

              return (
                <a
                  key={sport.sportId}
                  href={`/sports/${sport.slug}`}
                  className="glass-card rounded-2xl p-6 flex flex-col justify-between group cursor-pointer relative overflow-hidden"
                >
                  {/* Accent Top Border */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: sport.accentColor }}
                  />

                  <div>
                    {/* Header: Icon & Circular Progress */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{sportIcon}</span>
                        <div>
                          <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">
                            {sport.sportName}
                          </h3>
                          <span className="text-xs text-slate-400 font-medium">
                            {sport.completedModules} of {sport.totalModules} modules completed
                          </span>
                        </div>
                      </div>

                      <CircularProgress
                        progress={sport.percent}
                        size={64}
                        strokeWidth={6}
                        color={sport.accentColor}
                      />
                    </div>

                    {/* Progress Bar & Detail */}
                    <div className="space-y-1.5 mt-2">
                      <LinearProgress
                        progress={sport.percent}
                        color={sport.accentColor}
                        height={6}
                      />
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>Curriculum Progress</span>
                        <span className="font-bold text-white">{sport.percent}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>View Modules</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    {sport.completedModules === sport.totalModules && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <Award className="w-3 h-3" /> Completed
                      </span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* Available Sports to Enroll */}
      {available.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Explore More Sports
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {available.map((sport) => (
              <div
                key={sport.id}
                className="glass-panel rounded-2xl p-6 flex flex-col justify-between border border-white/10"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">
                      {sport.slug === "boxing"
                        ? "🥊"
                        : sport.slug === "football"
                        ? "⚽"
                        : "🎾"}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/5 text-slate-400">
                      {sport.totalModules} Modules
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1">{sport.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {sport.description || "Comprehensive coaching curriculum."}
                  </p>
                </div>

                <button
                  onClick={() => enrollMutation.mutate(sport.id)}
                  disabled={enrollMutation.isPending}
                  className="mt-6 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors border border-white/5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enroll in {sport.name}</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Scores & Badges Highlights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Scores */}
        <div className="md:col-span-2 glass-panel rounded-2xl p-6 border border-white/10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Recent Assessment Scores</span>
            </h3>
            <a
              href="/profile"
              className="text-xs text-blue-400 hover:underline font-semibold"
            >
              View Full History →
            </a>
          </div>

          {recentAttempts.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No assessments taken yet. Watch a module video to unlock the test!
            </p>
          ) : (
            <div className="space-y-3">
              {recentAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/50 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-white">
                      {attempt.moduleTitle}
                    </p>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {attempt.sportName} • {new Date(attempt.submittedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-sm font-black text-white">
                        {attempt.score} / {attempt.maxScore}
                      </span>
                      <p className="text-[10px] text-slate-400">{attempt.percent}%</p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-extrabold uppercase ${
                        attempt.passed
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {attempt.passed ? "Pass" : "Fail"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Badges Preview Widget */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Earned Accolades</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-center">
                <span className="text-2xl block mb-1">🥊</span>
                <span className="text-xs font-bold text-white block">First Bell</span>
                <span className="text-[10px] text-emerald-400 font-semibold">Unlocked</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-center">
                <span className="text-2xl block mb-1">⚽</span>
                <span className="text-xs font-bold text-white block">Hat Trick</span>
                <span className="text-[10px] text-emerald-400 font-semibold">Unlocked</span>
              </div>
            </div>
          </div>

          <a
            href="/profile"
            className="mt-6 block text-center py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors"
          >
            Inspect All Badges & Certificates →
          </a>
        </div>
      </section>
    </div>
  );
}
