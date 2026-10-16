import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateWatchProgressSchema } from "@/lib/validations";
import { recomputeModuleCompletion } from "@/lib/progress";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json().catch(() => null);

  const parsed = updateWatchProgressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid progress payload" }, { status: 400 });
  }

  const { moduleId, watchedSec, watchPercent } = parsed.data;

  // Retrieve current progress to ensure we don't regress videoCompleted
  const current = await db.moduleProgress.findUnique({
    where: { userId_moduleId: { userId, moduleId } },
  });

  const isVideoNowCompleted =
    current?.videoCompleted || watchPercent >= 0.9;

  const maxWatchedSec = Math.max(current?.watchedSec ?? 0, watchedSec);
  const maxWatchPercent = Math.max(current?.watchPercent ?? 0, watchPercent);

  const updatedProgress = await db.moduleProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    create: {
      userId,
      moduleId,
      watchedSec: maxWatchedSec,
      watchPercent: maxWatchPercent,
      videoCompleted: isVideoNowCompleted,
      lastWatchedAt: new Date(),
    },
    update: {
      watchedSec: maxWatchedSec,
      watchPercent: maxWatchPercent,
      videoCompleted: isVideoNowCompleted,
      lastWatchedAt: new Date(),
    },
  });

  // Recompute completion status
  await recomputeModuleCompletion(userId, moduleId);

  const finalProgress = await db.moduleProgress.findUnique({
    where: { id: updatedProgress.id },
  });

  return NextResponse.json({
    success: true,
    progress: finalProgress,
  });
}
