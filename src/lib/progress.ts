/**
 * Server-side progress computation.
 * Progress is computed from ModuleProgress records.
 * Never trust client-sent progress values for completion.
 */
import { db } from "@/lib/db";

export interface SportProgress {
  sportId: string;
  sportName: string;
  slug: string;
  accentColor: string;
  coverImageUrl: string | null;
  totalModules: number;
  completedModules: number;
  percent: number;
  lastWatchedAt: Date | null;
  currentModuleId: string | null;
  currentModuleTitle: string | null;
}

/**
 * Compute a student's progress across all enrolled sports.
 */
export async function getStudentSportProgress(userId: string): Promise<SportProgress[]> {
  const enrollments = await db.enrollment.findMany({
    where: { userId },
    include: {
      sport: {
        include: {
          modules: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
            include: {
              moduleProgress: {
                where: { userId },
              },
            },
          },
        },
      },
    },
  });

  return enrollments.map(({ sport }) => {
    const modules = sport.modules;
    const totalModules = modules.length;

    let completedModules = 0;
    let lastWatchedAt: Date | null = null;
    let currentModuleId: string | null = null;
    let currentModuleTitle: string | null = null;

    for (const mod of modules) {
      const progress = mod.moduleProgress[0];
      if (progress?.isCompleted) {
        completedModules++;
      } else if (currentModuleId === null && !progress?.isCompleted) {
        // First non-completed module = current
        currentModuleId = mod.id;
        currentModuleTitle = mod.title;
      }
      if (progress?.lastWatchedAt) {
        if (!lastWatchedAt || progress.lastWatchedAt > lastWatchedAt) {
          lastWatchedAt = progress.lastWatchedAt;
        }
      }
    }

    const percent =
      totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    return {
      sportId: sport.id,
      sportName: sport.name,
      slug: sport.slug,
      accentColor: sport.accentColor,
      coverImageUrl: sport.coverImageUrl,
      totalModules,
      completedModules,
      percent,
      lastWatchedAt,
      currentModuleId,
      currentModuleTitle,
    };
  });
}

/**
 * Check if a module should be unlocked for a student.
 * If sport.sequentialUnlock is true, all previous modules must be completed.
 */
export async function isModuleUnlocked(
  userId: string,
  moduleId: string
): Promise<boolean> {
  const currentMod = await db.module.findUnique({
    where: { id: moduleId },
    include: {
      sport: true,
    },
  });

  if (!currentMod) return false;
  if (!currentMod.sport.sequentialUnlock) return true;
  if (currentMod.order === 1) return true;

  // Check all previous modules are completed
  const previousModules = await db.module.findMany({
    where: {
      sportId: currentMod.sportId,
      order: { lt: currentMod.order },
      isPublished: true,
    },
    include: {
      moduleProgress: {
        where: { userId },
      },
    },
  });

  return previousModules.every((m) => m.moduleProgress[0]?.isCompleted === true);
}

/**
 * Recompute and persist module completion status.
 * Called after a video watch update or test submission.
 */
export async function recomputeModuleCompletion(
  userId: string,
  moduleId: string
): Promise<void> {
  const currentMod = await db.module.findUnique({
    where: { id: moduleId },
    include: {
      moduleProgress: { where: { userId } },
    },
  });

  if (!currentMod) return;

  const progress = currentMod.moduleProgress[0];
  if (!progress) return;

  const videoOk = !currentMod.requireVideoWatch || progress.videoCompleted;
  const testOk = !currentMod.requireTestPass || progress.testPassed;
  const isCompleted = videoOk && testOk;

  await db.moduleProgress.update({
    where: { id: progress.id },
    data: {
      isCompleted,
      completedAt: isCompleted && !progress.isCompleted ? new Date() : progress.completedAt,
    },
  });
}
