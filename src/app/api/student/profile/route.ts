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

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get progress per sport
  const sportsProgress = await getStudentSportProgress(userId);

  // Compute total completed modules across sports
  const totalCompletedModules = sportsProgress.reduce(
    (sum, sp) => sum + sp.completedModules,
    0
  );

  // Completed sports (100% completion)
  const completedSports = sportsProgress.filter(
    (sp) => sp.totalModules > 0 && sp.completedModules === sp.totalModules
  );

  // Attempts count and average score
  const attempts = await db.attempt.findMany({
    where: { userId, status: "SUBMITTED" },
    select: { percent: true, passed: true },
  });

  const totalAttempts = attempts.length;
  const passedTests = attempts.filter((a) => a.passed).length;
  const averageScore =
    totalAttempts > 0
      ? Math.round(
          attempts.reduce((acc, a) => acc + (a.percent ?? 0), 0) / totalAttempts
        )
      : 0;

  // Calculate Badges & Certificates
  const badges = [
    {
      id: "first-step",
      name: "First Bell",
      description: "Completed your first module",
      icon: "🥊",
      unlocked: totalCompletedModules >= 1,
      unlockedAt: totalCompletedModules >= 1 ? user.createdAt : null,
    },
    {
      id: "hat-trick",
      name: "Hat Trick",
      description: "Completed at least 3 modules",
      icon: "⚽",
      unlocked: totalCompletedModules >= 3,
      unlockedAt: totalCompletedModules >= 3 ? user.createdAt : null,
    },
    {
      id: "sharpshooter",
      name: "Sharpshooter",
      description: "Passed 3 or more assessments",
      icon: "🎯",
      unlocked: passedTests >= 3,
      unlockedAt: passedTests >= 3 ? user.createdAt : null,
    },
    {
      id: "champion",
      name: "Grand Champion",
      description: "Fully completed a sport curriculum",
      icon: "🏆",
      unlocked: completedSports.length >= 1,
      unlockedAt: completedSports.length >= 1 ? new Date() : null,
    },
    {
      id: "century-club",
      name: "Century Club",
      description: "Scored 100% on any test",
      icon: "💯",
      unlocked: attempts.some((a) => (a.percent ?? 0) >= 100),
      unlockedAt: attempts.some((a) => (a.percent ?? 0) >= 100) ? new Date() : null,
    },
  ];

  // Certificates for fully completed sports
  const certificates = completedSports.map((sp) => ({
    id: `cert-${sp.sportId}`,
    sportName: sp.sportName,
    sportSlug: sp.slug,
    issuedTo: user.name,
    issuedAt: new Date().toISOString(),
    verificationCode: `LMS-${sp.slug.toUpperCase()}-${user.id.slice(0, 6)}`,
  }));

  return NextResponse.json({
    user,
    stats: {
      enrolledSportsCount: sportsProgress.length,
      totalCompletedModules,
      totalAttempts,
      passedTests,
      averageScore,
    },
    sportsProgress,
    badges,
    certificates,
  });
}
