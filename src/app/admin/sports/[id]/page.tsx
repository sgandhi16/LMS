"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Play,
  FileText,
  Trash2,
  Edit,
  CheckCircle2,
  Lock,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface ModuleItem {
  id: string;
  sportId: string;
  title: string;
  description: string | null;
  order: number;
  requireVideoWatch: boolean;
  requireTestPass: boolean;
  isPublished: boolean;
  video: { id: string; provider: string } | null;
  test: {
    id: string;
    title: string;
    _count: { questions: number; attempts: number };
  } | null;
  _count: { moduleProgress: number };
}

interface SportDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  accentColor: string;
  sequentialUnlock: boolean;
  isPublished: boolean;
  modules: ModuleItem[];
}

export default function AdminSportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [reqVideo, setReqVideo] = useState(true);
  const [reqTest, setReqTest] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-sport", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/sports/${id}`);
      if (!res.ok) throw new Error("Failed to load sport");
      return res.json() as Promise<{ sport: SportDetail }>;
    },
  });

  // Reorder modules mutation
  const reorderMutation = useMutation({
    mutationFn: async (moduleIds: string[]) => {
      const res = await fetch("/api/admin/modules/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sportId: id, moduleIds }),
      });
      if (!res.ok) throw new Error("Failed to reorder modules");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Module order updated and saved!");
      queryClient.invalidateQueries({ queryKey: ["admin-sport", id] });
    },
    onError: () => {
      toast.error("Failed to reorder modules");
    },
  });

  // Create module mutation
  const createModuleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create module");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Module added to curriculum!");
      setShowAddModal(false);
      setNewTitle("");
      setNewDesc("");
      queryClient.invalidateQueries({ queryKey: ["admin-sport", id] });
    },
    onError: () => {
      toast.error("Failed to create module");
    },
  });

  // Toggle sequential unlock
  const toggleSequentialMutation = useMutation({
    mutationFn: async (sequentialUnlock: boolean) => {
      const res = await fetch(`/api/admin/sports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequentialUnlock }),
      });
      if (!res.ok) throw new Error("Failed to update setting");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Progression settings updated");
      queryClient.invalidateQueries({ queryKey: ["admin-sport", id] });
    },
  });

  // Delete module mutation
  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const res = await fetch(`/api/admin/modules/${moduleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete module");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Module removed");
      queryClient.invalidateQueries({ queryKey: ["admin-sport", id] });
    },
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center text-slate-400">Loading curriculum...</div>;
  }

  const { sport } = data;
  const modules = sport.modules || [];

  const moveModule = (currentIndex: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const reordered = [...modules];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    reorderMutation.mutate(reordered.map((m) => m.id));
  };

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/admin/sports"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Sports</span>
        </Link>
      </div>

      {/* Header Info & Actions */}
      <div className="glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl relative">
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: sport.accentColor }}
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {sport.slug === "boxing"
                  ? "🥊"
                  : sport.slug === "football"
                  ? "⚽"
                  : "🎾"}
              </span>
              <h1 className="text-3xl font-black text-white">{sport.name}</h1>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              {sport.description || "Manage module sequencing and content."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 self-stretch md:self-auto">
            {/* Sequential Unlock Switch */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/5">
              <input
                type="checkbox"
                id="toggleSeq"
                checked={sport.sequentialUnlock}
                onChange={(e) => toggleSequentialMutation.mutate(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-white/10"
              />
              <label
                htmlFor="toggleSeq"
                className="text-xs font-bold text-slate-300 cursor-pointer"
              >
                Sequential Unlocking
              </label>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-950/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Module</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ordered Modules List with Reorder Controls */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span>Modules & Sequencing ({modules.length})</span>
          </h2>
          <span className="text-xs text-slate-400">
            Use the arrows to reorder modules instantly
          </span>
        </div>

        <div className="space-y-3">
          {modules.map((m, idx) => (
            <div
              key={m.id}
              className="glass-panel rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-4 group hover:border-white/20 transition-all"
            >
              {/* Order Controls & Title */}
              <div className="flex items-center gap-4">
                {/* Up/Down buttons */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveModule(idx, "up")}
                    disabled={idx === 0 || reorderMutation.isPending}
                    className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white disabled:opacity-20 transition-colors"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveModule(idx, "down")}
                    disabled={idx === modules.length - 1 || reorderMutation.isPending}
                    className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white disabled:opacity-20 transition-colors"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Module Order Number */}
                <span className="w-8 h-8 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center font-mono text-xs font-bold text-slate-400">
                  {m.order}
                </span>

                {/* Title & tags */}
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    {m.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Play className="w-3 h-3 text-slate-500" />
                      <span>{m.video ? "Video Ready" : "No Video"}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-500" />
                      <span>
                        {m.test
                          ? `Test (${m.test._count.questions} Qs)`
                          : "No Assessment"}
                      </span>
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      {m._count.moduleProgress} Completed
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions: Edit Content / Delete */}
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/modules/${m.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold border border-white/10 transition-colors"
                >
                  Edit Video & Test →
                </Link>

                <button
                  onClick={() => {
                    if (confirm(`Delete module "${m.title}"?`)) {
                      deleteModuleMutation.mutate(m.id);
                    }
                  }}
                  className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete Module"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Module Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-white/10 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-white mb-2">
              Add Module to {sport.name}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Specify module details. You can configure videos and questions in the next step.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createModuleMutation.mutate({
                  sportId: id,
                  title: newTitle,
                  description: newDesc,
                  requireVideoWatch: reqVideo,
                  requireTestPass: reqTest,
                  isPublished: true,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Module Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Advanced Footwork & Angles"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Coaching Description
                </label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Drill instructions and key focus points..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="reqVid"
                    checked={reqVideo}
                    onChange={(e) => setReqVideo(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-white/10"
                  />
                  <label htmlFor="reqVid" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    Require Video Watch (≥90%)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="reqTst"
                    checked={reqTest}
                    onChange={(e) => setReqTest(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-white/10"
                  />
                  <label htmlFor="reqTst" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    Require Test Pass
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createModuleMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors"
                >
                  {createModuleMutation.isPending ? "Adding..." : "Add Module"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
