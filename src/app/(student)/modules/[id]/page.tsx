"use client";

import { use, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Download,
  Play,
  Lock,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { VideoPlayer } from "@/components/player/video-player";
import { toast } from "sonner";

interface ModuleData {
  id: string;
  title: string;
  description: string | null;
  order: number;
  requireVideoWatch: boolean;
  requireTestPass: boolean;
  sport: {
    id: string;
    name: string;
    slug: string;
    accentColor: string;
  };
  video: {
    id: string;
    provider: string;
    playbackUrl: string | null;
    durationSec: number | null;
  } | null;
  attachments: Array<{
    id: string;
    name: string;
    sizeBytes: number | null;
    mimeType: string | null;
  }>;
  test: {
    id: string;
    title: string;
    passPercent: number;
    timeLimitSec: number | null;
    maxAttempts: number | null;
    questionCount: number;
    hasPassed: boolean;
    attemptsUsed: number;
  } | null;
  progress: {
    watchedSec: number;
    watchPercent: number;
    videoCompleted: boolean;
    testPassed: boolean;
    isCompleted: boolean;
  };
  navigation: {
    prev: { id: string; title: string; order: number } | null;
    next: { id: string; title: string; order: number } | null;
  };
}

export default function ModulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["module", id],
    queryFn: async () => {
      const res = await fetch(`/api/student/modules/${id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load module");
      }
      return res.json() as Promise<{ module: ModuleData }>;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
        <div className="h-96 rounded-2xl bg-slate-900/60" />
        <div className="h-32 rounded-2xl bg-slate-900/60" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Module Unavailable</h2>
        <p className="text-xs text-slate-400 mb-6">
          {error?.message || "This module could not be loaded."}
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

  const { module } = data;
  const isVideoDone = module.progress.videoCompleted || !module.requireVideoWatch;
  const isTestPassed = module.progress.testPassed;
  const canTakeTest = module.test !== null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <a
          href={`/sports/${module.sport.slug}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {module.sport.name}</span>
        </a>

        {/* Completion status badge */}
        {module.progress.isCompleted ? (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Module Completed</span>
          </span>
        ) : (
          <span className="text-xs font-semibold text-slate-400">
            Module {module.order}
          </span>
        )}
      </div>

      {/* Module Title & Sport Tag */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: module.sport.accentColor }}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {module.sport.name} • Module {module.order}
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white">
          {module.title}
        </h1>
      </div>

      {/* Video Player */}
      {module.video && (
        <section>
          <VideoPlayer
            moduleId={module.id}
            playbackUrl={module.video.playbackUrl}
            provider={module.video.provider}
            initialWatchedSec={module.progress.watchedSec}
            initialWatchPercent={module.progress.watchPercent}
            durationSec={module.video.durationSec}
            videoCompleted={module.progress.videoCompleted}
            onProgressUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ["module", id] });
            }}
          />
        </section>
      )}

      {/* Action Bar: Take Test + Video Status */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <span>Video Status:</span>
            {module.progress.videoCompleted ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Watched (≥ 90%)
              </span>
            ) : (
              <span className="text-amber-400">
                {Math.round(module.progress.watchPercent * 100)}% Watched (Requires ≥ 90%)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {module.test
              ? `Pass the ${module.test.passPercent}% assessment to prove mastery.`
              : "No assessment required for this module."}
          </p>
        </div>

        {/* Take Test Button */}
        {module.test && (
          <div className="flex items-center gap-3 w-full md:w-auto">
            <a
              href={`/tests/${module.test.id}`}
              className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-xl transition-all ${
                isTestPassed
                  ? "bg-slate-800 text-emerald-300 border border-emerald-500/30 hover:bg-slate-700"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-900/40 hover:brightness-110"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>
                {isTestPassed
                  ? "Review / Retake Assessment"
                  : "Take Module Assessment"}
              </span>
            </a>
          </div>
        )}
      </div>

      {/* Description & Coaching Notes */}
      <div className="glass-panel rounded-2xl p-8 border border-white/10 space-y-4">
        <h2 className="text-lg font-black text-white">Coaching Notes & Instructions</h2>
        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {module.description ||
            "Pay close attention to body balance, hand alignment, and breath cadence during this drill. Repeat the movements dry before executing at full speed."}
        </div>

        {/* Attachments */}
        {module.attachments.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Reference Materials & Drills
            </h3>
            <div className="flex flex-wrap gap-3">
              {module.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 hover:border-white/20 transition-colors"
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>{att.name}</span>
                  <Download className="w-3.5 h-3.5 text-slate-500 hover:text-white cursor-pointer ml-1" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Prev / Next Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        {module.navigation.prev ? (
          <a
            href={`/modules/${module.navigation.prev.id}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors border border-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
            <div className="text-left">
              <span className="block text-[10px] text-slate-500">Previous</span>
              <span>{module.navigation.prev.title}</span>
            </div>
          </a>
        ) : (
          <div />
        )}

        {module.navigation.next ? (
          <a
            href={`/modules/${module.navigation.next.id}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors border border-white/5"
          >
            <div className="text-right">
              <span className="block text-[10px] text-slate-500">Next Module</span>
              <span>{module.navigation.next.title}</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </a>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
