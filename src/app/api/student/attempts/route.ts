import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const attempts = await db.attempt.findMany({
    where: {
      userId,
      status: "SUBMITTED",
    },
    orderBy: { submittedAt: "desc" },
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
    attempts: attempts.map((a) => ({
      id: a.id,
      testTitle: a.test.title,
      moduleTitle: a.test.module.title,
      sportName: a.test.module.sport.name,
      sportSlug: a.test.module.sport.slug,
      score: a.score,
      maxScore: a.maxScore,
      percent: a.percent,
      passed: a.passed,
      passPercent: a.test.passPercent,
      submittedAt: a.submittedAt,
    })),
  });
}
