import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const userId = session.user.id;

  const sport = await db.sport.findUnique({
    where: { slug },
    include: {
      modules: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        include: {
          test: {
            select: {
              id: true,
              title: true,
              passPercent: true,
              timeLimitSec: true,
            },
          },
          video: {
            select: {
              id: true,
              durationSec: true,
              provider: true,
            },
          },
          moduleProgress: {
            where: { userId },
          },
        },
      },
      enrollments: {
        where: { userId },
      },
    },
  });

  if (!sport) {
    return NextResponse.json({ error: "Sport not found" }, { status: 404 });
  }

  const isEnrolled = sport.enrollments.length > 0;

  let completedCount = 0;
  let allPreviousCompleted = true;

  const modulesWithStatus = sport.modules.map((m, index) => {
    const progress = m.moduleProgress[0] || null;
    const isCompleted = progress?.isCompleted ?? false;
    const watchPercent = progress?.watchPercent ?? 0;
    const watchedSec = progress?.watchedSec ?? 0;
    const videoCompleted = progress?.videoCompleted ?? false;
    const testPassed = progress?.testPassed ?? false;

    if (isCompleted) {
      completedCount++;
    }

    // Determine lock state
    let isLocked = false;
    if (sport.sequentialUnlock && index > 0 && !allPreviousCompleted) {
      isLocked = true;
    }

    if (!isCompleted) {
      allPreviousCompleted = false;
    }

    let status: "LOCKED" | "COMPLETED" | "IN_PROGRESS" | "UNLOCKED" = "UNLOCKED";
    if (isLocked) {
      status = "LOCKED";
    } else if (isCompleted) {
      status = "COMPLETED";
    } else if (watchPercent > 0 || watchedSec > 0) {
      status = "IN_PROGRESS";
    }

    return {
      id: m.id,
      title: m.title,
      description: m.description,
      order: m.order,
      requireVideoWatch: m.requireVideoWatch,
      requireTestPass: m.requireTestPass,
      status,
      isLocked,
      isCompleted,
      videoCompleted,
      testPassed,
      watchedSec,
      watchPercent,
      hasVideo: !!m.video,
      videoDurationSec: m.video?.durationSec ?? null,
      test: m.test
        ? {
            id: m.test.id,
            title: m.test.title,
            passPercent: m.test.passPercent,
            timeLimitSec: m.test.timeLimitSec,
          }
        : null,
    };
  });

  return NextResponse.json({
    sport: {
      id: sport.id,
      name: sport.name,
      slug: sport.slug,
      description: sport.description,
      coverImageUrl: sport.coverImageUrl,
      accentColor: sport.accentColor,
      sequentialUnlock: sport.sequentialUnlock,
      totalModules: sport.modules.length,
      completedModules: completedCount,
      percent:
        sport.modules.length > 0
          ? Math.round((completedCount / sport.modules.length) * 100)
          : 0,
      isEnrolled,
    },
    modules: modulesWithStatus,
  });
}
