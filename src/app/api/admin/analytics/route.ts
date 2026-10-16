import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  // 1. High-level KPIs
  const [totalStudents, totalEnrollments, totalAttempts, sports] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.enrollment.count(),
    db.attempt.count({ where: { status: "SUBMITTED" } }),
    db.sport.findMany({
      include: {
        modules: {
          include: {
            test: true,
            _count: { select: { moduleProgress: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    }),
  ]);

  // Overall pass rate
  const passedAttempts = await db.attempt.count({
    where: { status: "SUBMITTED", passed: true },
  });
  const overallPassRate =
    totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;

  // 2. Sport Completion & Enrollment metrics
  const sportsAnalytics = await Promise.all(
    sports.map(async (sport) => {
      const totalModules = sport.modules.length;
      const enrolledCount = sport._count.enrollments;

      // Completed modules count for this sport
      const moduleIds = sport.modules.map((m) => m.id);
      const completedProgressCount = await db.moduleProgress.count({
        where: {
          moduleId: { in: moduleIds },
          isCompleted: true,
        },
      });

      // Average score on tests in this sport
      const testIds = sport.modules
        .map((m) => m.test?.id)
        .filter((id): id is string => Boolean(id));

      const attempts = await db.attempt.findMany({
        where: {
          testId: { in: testIds },
          status: "SUBMITTED",
        },
        select: { percent: true, passed: true },
      });

      const avgScore =
        attempts.length > 0
          ? Math.round(
              attempts.reduce((sum, a) => sum + (a.percent ?? 0), 0) /
                attempts.length
            )
          : 0;

      const completionRate =
        enrolledCount > 0 && totalModules > 0
          ? Math.round((completedProgressCount / (enrolledCount * totalModules)) * 100)
          : 0;

      return {
        id: sport.id,
        name: sport.name,
        slug: sport.slug,
        accentColor: sport.accentColor,
        totalModules,
        enrolledCount,
        completedProgressCount,
        completionRate: Math.min(100, completionRate),
        avgScore,
        attemptsCount: attempts.length,
      };
    })
  );

  // 3. Hardest Questions (lowest correct rate, min 1 response)
  const questions = await db.question.findMany({
    include: {
      test: {
        include: {
          module: { include: { sport: true } },
        },
      },
      attemptAnswers: {
        where: {
          attempt: { status: "SUBMITTED" },
        },
        select: { isCorrect: true },
      },
    },
  });

  const hardestQuestions = questions
    .filter((q) => q.attemptAnswers.length > 0)
    .map((q) => {
      const total = q.attemptAnswers.length;
      const correct = q.attemptAnswers.filter((a) => a.isCorrect).length;
      const correctRate = Math.round((correct / total) * 100);

      return {
        id: q.id,
        prompt: q.prompt,
        type: q.type,
        sportName: q.test.module.sport.name,
        moduleTitle: q.test.module.title,
        totalResponses: total,
        correctResponses: correct,
        correctRate,
      };
    })
    .sort((a, b) => a.correctRate - b.correctRate)
    .slice(0, 10);

  // 4. Module completion rates
  const modulesAnalytics = await db.module.findMany({
    where: { isPublished: true },
    orderBy: [{ sportId: "asc" }, { order: "asc" }],
    include: {
      sport: { select: { name: true } },
      _count: {
        select: {
          moduleProgress: { where: { isCompleted: true } },
        },
      },
    },
    take: 15,
  });

  const moduleCompletion = modulesAnalytics.map((m) => ({
    id: m.id,
    title: m.title,
    sportName: m.sport.name,
    order: m.order,
    completedStudents: m._count.moduleProgress,
  }));

  return NextResponse.json({
    kpis: {
      totalStudents,
      totalEnrollments,
      totalAttempts,
      overallPassRate,
    },
    sportsAnalytics,
    hardestQuestions,
    moduleCompletion,
  });
}
