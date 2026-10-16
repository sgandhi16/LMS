import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStudentSportProgress } from "@/lib/progress";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get enrolled sports with progress
  const enrolledProgress = await getStudentSportProgress(userId);
  const enrolledSportIds = new Set(enrolledProgress.map((p) => p.sportId));

  // Get other published sports available for enrollment
  const otherSports = await db.sport.findMany({
    where: {
      isPublished: true,
      id: { notIn: Array.from(enrolledSportIds) },
    },
    include: {
      _count: {
        select: { modules: { where: { isPublished: true } } },
      },
    },
  });

  // Recent scores / attempts
  const recentAttempts = await db.attempt.findMany({
    where: {
      userId,
      status: "SUBMITTED",
    },
    orderBy: { submittedAt: "desc" },
    take: 5,
    include: {
      test: {
        include: {
          module: {
            include: { sport: true },
          },
        },
      },
    },
  });

  return NextResponse.json({
    enrolled: enrolledProgress,
    available: otherSports.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      coverImageUrl: s.coverImageUrl,
      accentColor: s.accentColor,
      totalModules: s._count.modules,
    })),
    recentAttempts: recentAttempts.map((a) => ({
      id: a.id,
      testTitle: a.test.title,
      moduleTitle: a.test.module.title,
      sportName: a.test.module.sport.name,
      sportSlug: a.test.module.sport.slug,
      score: a.score,
      maxScore: a.maxScore,
      percent: a.percent,
      passed: a.passed,
      submittedAt: a.submittedAt,
    })),
  });
}
