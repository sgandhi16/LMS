import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim() || "";
  const role = url.searchParams.get("role") || "";

  const students = await db.user.findMany({
    where: {
      ...(role ? { role: role as "STUDENT" | "ADMIN" } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          enrollments: true,
          attempts: { where: { status: "SUBMITTED" } },
          moduleProgress: { where: { isCompleted: true } },
        },
      },
    },
  });

  return NextResponse.json({
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      isActive: s.isActive,
      createdAt: s.createdAt,
      enrolledSportsCount: s._count.enrollments,
      submittedAttemptsCount: s._count.attempts,
      completedModulesCount: s._count.moduleProgress,
    })),
  });
}
