"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  BookOpen,
  ArrowRight,
  Shield,
  Trash2,
  Edit,
  ExternalLink,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface SportItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  accentColor: string;
  sequentialUnlock: boolean;
  isPublished: boolean;
  _count: {
    modules: number;
    enrollments: number;
  };
}

export default function AdminSportsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [sequentialUnlock, setSequentialUnlock] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-sports"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sports");
      if (!res.ok) throw new Error("Failed to load sports");
      return res.json() as Promise<{ sports: SportItem[] }>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/sports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create sport");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Sport curriculum created!");
      setShowCreateModal(false);
      setName("");
      setSlug("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["admin-sports"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create sport");
    },
  });

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      slug,
      description,
      accentColor,
      sequentialUnlock,
      isPublished: true,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-slate-900 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-56 rounded-2xl bg-slate-900/60" />
          <div className="h-56 rounded-2xl bg-slate-900/60" />
          <div className="h-56 rounded-2xl bg-slate-900/60" />
        </div>
      </div>
    );
  }

  const sports = data?.sports || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            Sports & Curriculum Management
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Create sports, organize modules, and configure sequential progression
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-950/30 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Sport Curriculum</span>
        </button>
      </div>

      {/* Sports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sports.map((sport) => (
          <div
            key={sport.id}
            className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col justify-between relative overflow-hidden group"
          >
            <div
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{ backgroundColor: sport.accentColor }}
            />

            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <span className="text-3xl">
                  {sport.slug === "boxing"
                    ? "🥊"
                    : sport.slug === "football"
                    ? "⚽"
                    : "🎾"}
                </span>

                <div className="flex items-center gap-2">
                  {sport.sequentialUnlock && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Sequential
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Published
                  </span>
                </div>
              </div>

              <h2 className="text-lg font-bold text-white mb-1">{sport.name}</h2>
              <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                {sport.description || "Training modules and assessments."}
              </p>

              <div className="flex items-center gap-4 text-xs text-slate-300 font-medium py-3 border-y border-white/5">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>{sport._count.modules} Modules</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>{sport._count.enrollments} Students</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-2 flex items-center justify-between">
              <Link
                href={`/admin/sports/${sport.id}`}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
              >
                <span>Manage Modules & Reorder</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Create Sport Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-white/10 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-white mb-2">
              Create New Sport Curriculum
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Add a new sports discipline to the academy catalog.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Sport Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Swimming, Basketball"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Slug (URL identifier)
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="swimming"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Overview of this sport curriculum..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Accent Color
                  </label>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-full h-10 rounded-xl bg-slate-900 border border-white/10 cursor-pointer p-1"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="seqUnlock"
                    checked={sequentialUnlock}
                    onChange={(e) => setSequentialUnlock(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-900 border-white/20"
                  />
                  <label htmlFor="seqUnlock" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    Sequential Unlocking
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors"
                >
                  {createMutation.isPending ? "Creating..." : "Create Sport"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
