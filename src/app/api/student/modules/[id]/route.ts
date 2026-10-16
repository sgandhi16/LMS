import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getVideoPlaybackUrl } from "@/lib/video";
import { isModuleUnlocked } from "@/lib/progress";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  // Check if module is unlocked for student
  const unlocked = await isModuleUnlocked(userId, id);
  if (!unlocked) {
    return NextResponse.json(
      { error: "This module is locked. Please complete previous modules first." },
      { status: 403 }
    );
  }

  const mod = await db.module.findUnique({
    where: { id },
    include: {
      sport: {
        select: {
          id: true,
          name: true,
          slug: true,
          accentColor: true,
          sequentialUnlock: true,
        },
      },
      video: true,
      attachments: true,
      test: {
        include: {
          attempts: {
            where: { userId },
            orderBy: { startedAt: "desc" },
            select: {
              id: true,
              status: true,
              score: true,
              maxScore: true,
              percent: true,
              passed: true,
              startedAt: true,
              submittedAt: true,
            },
          },
          _count: {
            select: { questions: true },
          },
        },
      },
      moduleProgress: {
        where: { userId },
      },
    },
  });

  if (!mod || !mod.isPublished) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  // Generate short-lived signed video URL if video exists
  let playbackUrl: string | null = null;
  if (mod.video) {
    try {
      playbackUrl = await getVideoPlaybackUrl({
        provider: mod.video.provider,
        storageKey: mod.video.storageKey,
        externalUrl: mod.video.externalUrl,
      });
    } catch (err) {
      console.error("Failed to generate video playback URL:", err);
    }
  }

  // Next and previous modules in the same sport
  const [prevModule, nextModule] = await Promise.all([
    db.module.findFirst({
      where: {
        sportId: mod.sportId,
        order: { lt: mod.order },
        isPublished: true,
      },
      orderBy: { order: "desc" },
      select: { id: true, title: true, order: true },
    }),
    db.module.findFirst({
      where: {
        sportId: mod.sportId,
        order: { gt: mod.order },
        isPublished: true,
      },
      orderBy: { order: "asc" },
      select: { id: true, title: true, order: true },
    }),
  ]);

  const progress = mod.moduleProgress[0] || null;

  return NextResponse.json({
    module: {
      id: mod.id,
      title: mod.title,
      description: mod.description,
      order: mod.order,
      requireVideoWatch: mod.requireVideoWatch,
      requireTestPass: mod.requireTestPass,
      sport: mod.sport,
      video: mod.video
        ? {
            id: mod.video.id,
            provider: mod.video.provider,
            playbackUrl,
            durationSec: mod.video.durationSec,
          }
        : null,
      attachments: mod.attachments.map((a) => ({
        id: a.id,
        name: a.name,
        sizeBytes: a.sizeBytes ? Number(a.sizeBytes) : null,
        mimeType: a.mimeType,
      })),
      test: mod.test
        ? {
            id: mod.test.id,
            title: mod.test.title,
            passPercent: mod.test.passPercent,
            timeLimitSec: mod.test.timeLimitSec,
            maxAttempts: mod.test.maxAttempts,
            questionCount: mod.test._count.questions,
            attempts: mod.test.attempts,
            hasPassed: mod.test.attempts.some((a) => a.passed),
            attemptsUsed: mod.test.attempts.filter((a) => a.status === "SUBMITTED").length,
          }
        : null,
      progress: {
        watchedSec: progress?.watchedSec ?? 0,
        watchPercent: progress?.watchPercent ?? 0,
        videoCompleted: progress?.videoCompleted ?? false,
        testPassed: progress?.testPassed ?? false,
        isCompleted: progress?.isCompleted ?? false,
        completedAt: progress?.completedAt ?? null,
      },
      navigation: {
        prev: prevModule,
        next: nextModule,
      },
    },
  });
}
