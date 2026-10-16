"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Lock,
  CheckCircle2,
  Play,
  Clock,
  Award,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  FileText,
} from "lucide-react";
import { CircularProgress, LinearProgress } from "@/components/shared/progress-ring";
import { formatDuration } from "@/lib/utils";

interface ModuleItem {
  id: string;
  title: string;
  description: string | null;
  order: number;
  requireVideoWatch: boolean;
  requireTestPass: boolean;
  status: "LOCKED" | "COMPLETED" | "IN_PROGRESS" | "UNLOCKED";
  isLocked: boolean;
  isCompleted: boolean;
  videoCompleted: boolean;
  testPassed: boolean;
  watchedSec: number;
  watchPercent: number;
  hasVideo: boolean;
  videoDurationSec: number | null;
  test: {
    id: string;
    title: string;
    passPercent: number;
    timeLimitSec: number | null;
  } | null;
}

interface SportDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  accentColor: string;
  sequentialUnlock: boolean;
  totalModules: number;
  completedModules: number;
  percent: number;
  isEnrolled: boolean;
}

export default function SportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ["sport", slug],
    queryFn: async () => {
      const res = await fetch(`/api/student/sports/${slug}`);
      if (!res.ok) throw new Error("Failed to load sport details");
      return res.json() as Promise<{
        sport: SportDetail;
        modules: ModuleItem[];
      }>;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
        <div className="h-44 rounded-3xl bg-slate-900/60" />
        <div className="space-y-4">
          <div className="h-20 rounded-2xl bg-slate-900/60" />
          <div className="h-20 rounded-2xl bg-slate-900/60" />
          <div className="h-20 rounded-2xl bg-slate-900/60" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Sport Not Found</h2>
        <p className="text-xs text-slate-400 mb-6">
          Could not locate the requested training curriculum.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </a>
      </div>
    );
  }

  const { sport, modules } = data;
  const isBoxing = sport.slug === "boxing";
  const icon = isBoxing ? "🥊" : sport.slug === "football" ? "⚽" : "🎾";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </a>
      </div>

      {/* Sport Hero Card */}
      <div className="glass-panel rounded-3xl p-8 relative overflow-hidden shadow-2xl border border-white/10">
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: sport.accentColor }}
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{icon}</span>
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Certified Curriculum
              </span>
              {sport.sequentialUnlock && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Sequential Progression Active
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-white">
              {sport.name} Training
            </h1>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {sport.description ||
                "Master fundamental to elite techniques with step-by-step videos and verified assessments."}
            </p>
          </div>

          {/* Progress summary */}
          <div className="flex items-center gap-5 p-4 rounded-2xl bg-slate-900/60 border border-white/5 shrink-0 self-stretch md:self-auto justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Overall Mastery</span>
              <span className="text-2xl font-black text-white">
                {sport.completedModules} / {sport.totalModules}
              </span>
              <span className="text-xs text-slate-400 block">modules completed</span>
            </div>

            <CircularProgress
              progress={sport.percent}
              size={72}
              strokeWidth={7}
              color={sport.accentColor}
            />
          </div>
        </div>

        {/* Linear progress bar */}
        <div className="mt-6 pt-6 border-t border-white/5">
          <LinearProgress
            progress={sport.percent}
            color={sport.accentColor}
            height={8}
            showLabel
          />
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xl font-black text-white tracking-tight">
            Curriculum Modules ({modules.length})
          </h2>
          {sport.sequentialUnlock && (
            <span className="text-xs text-slate-400">
              Complete each module to unlock the next
            </span>
          )}
        </div>

        <div className="space-y-3">
          {modules.map((m) => {
            const isClickable = !m.isLocked;

            return (
              <div
                key={m.id}
                className={`glass-panel rounded-2xl p-5 border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  m.isLocked
                    ? "opacity-55 border-white/5 cursor-not-allowed bg-slate-950/40"
                    : "hover:border-white/20 hover:bg-white/[0.04] cursor-pointer"
                }`}
              >
                <div className="flex items-start sm:items-center gap-4">
                  {/* Status Indicator Icon */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold text-sm ${
                      m.status === "COMPLETED"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : m.status === "IN_PROGRESS"
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : m.status === "LOCKED"
                        ? "bg-slate-800 text-slate-500 border border-white/5"
                        : "bg-white/5 text-slate-300"
                    }`}
                  >
                    {m.status === "COMPLETED" ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : m.status === "IN_PROGRESS" ? (
                      <Play className="w-5 h-5 fill-current" />
                    ) : m.status === "LOCKED" ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      <span>{m.order < 10 ? `0${m.order}` : m.order}</span>
                    )}
                  </div>

                  {/* Title & Requirements */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase">
                        Module {m.order}
                      </span>
                      {m.status === "COMPLETED" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          Completed
                        </span>
                      )}
                      {m.status === "IN_PROGRESS" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                          {Math.round(m.watchPercent * 100)}% Watched
                        </span>
                      )}
                      {m.isLocked && (
                        <span className="text-[10px] font-semibold text-slate-500">
                          Locked (Complete previous)
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                      {m.title}
                    </h3>

                    {/* Requirements Tags */}
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                      {m.hasVideo && (
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3 text-slate-500" />
                          <span>
                            {m.videoDurationSec
                              ? formatDuration(m.videoDurationSec)
                              : "Video"}
                            {m.videoCompleted && " (Watched ✓)"}
                          </span>
                        </span>
                      )}

                      {m.test && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-500" />
                          <span>
                            Assessment ({m.test.passPercent}% pass)
                            {m.testPassed && " (Passed ✓)"}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <div className="self-end sm:self-center shrink-0">
                  {isClickable ? (
                    <a
                      href={`/modules/${m.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-900/20"
                    >
                      <span>
                        {m.status === "COMPLETED"
                          ? "Review Module"
                          : m.status === "IN_PROGRESS"
                          ? "Resume Training"
                          : "Start Module"}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-slate-500 text-xs font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Locked</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
