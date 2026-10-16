"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Shield,
  ArrowRight,
  UserX,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface StudentItem {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  enrolledSportsCount: number;
  submittedAttemptsCount: number;
  completedModulesCount: number;
}

export default function AdminStudentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-students", search],
    queryFn: async () => {
      const res = await fetch(`/api/admin/students?search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error("Failed to load students");
      return res.json() as Promise<{ students: StudentItem[] }>;
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update student status");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Student status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading student directory...</div>;
  }

  const students = data?.students || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            Student Management
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            View athlete progress, manage enrollments, and toggle account activation
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Students Directory Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-white/10 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Athlete / User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Enrolled Sports</th>
                <th className="px-6 py-4">Completed Modules</th>
                <th className="px-6 py-4">Tests Taken</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No students match the search filter.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-white block">
                          {student.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {student.email}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          student.role === "ADMIN"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        {student.role}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {student.isActive ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Deactivated
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono font-bold text-slate-300">
                      {student.enrolledSportsCount} Sports
                    </td>

                    <td className="px-6 py-4 font-mono font-bold text-white">
                      {student.completedModulesCount} Modules
                    </td>

                    <td className="px-6 py-4 font-mono font-bold text-slate-300">
                      {student.submittedAttemptsCount} Attempts
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Progress</span>
                        </Link>

                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: student.id,
                              isActive: !student.isActive,
                            })
                          }
                          className={`p-1.5 rounded-lg text-xs transition-colors ${
                            student.isActive
                              ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                              : "text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                          title={student.isActive ? "Deactivate" : "Activate"}
                        >
                          {student.isActive ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                      </div>
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
