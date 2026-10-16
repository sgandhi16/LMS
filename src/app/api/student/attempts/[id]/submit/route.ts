import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { submittedAnswerSchema } from "@/lib/validations";
import { scoreAttempt, computePassFail } from "@/lib/scoring";
import { recomputeModuleCompletion } from "@/lib/progress";
import { rateLimit } from "@/lib/utils";
import { z } from "zod";

const submitSchema = z.object({
  answers: z.array(submittedAnswerSchema),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: attemptId } = await params;
  const userId = session.user.id;

  // Rate limiting: 20 submits per minute per user
  const limit = rateLimit(`submit:${userId}`, 20, 60_000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many submissions. Please slow down." },
      { status: 429 }
    );
  }

  // Load attempt with test
  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    include: {
      test: {
        include: {
          module: true,
          questions: {
            include: {
              options: true,
              acceptedAnswers: true,
            },
          },
        },
      },
    },
  });

  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.status === "SUBMITTED") {
    return NextResponse.json(
      { error: "This attempt has already been submitted." },
      { status: 400 }
    );
  }

  const now = new Date();
  const graceSec = Number(process.env.TEST_SUBMISSION_GRACE_PERIOD_SEC ?? 30);

  // Enforce server-side time limit check
  if (
    attempt.expiresAt &&
    now.getTime() > attempt.expiresAt.getTime() + graceSec * 1000
  ) {
    await db.attempt.update({
      where: { id: attemptId },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json(
      { error: "Time limit exceeded. This test attempt has expired." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission payload" }, { status: 400 });
  }

  const { answers } = parsed.data;

  // Run server-side scoring
  const scoreResult = scoreAttempt(attempt.test.questions, answers);
  const isPassed = computePassFail(scoreResult.percent, attempt.test.passPercent);

  // Single transaction: update attempt + answers + module progress
  const finalResult = await db.$transaction(async (tx) => {
    // 1. Update Attempt
    const updatedAttempt = await tx.attempt.update({
      where: { id: attemptId },
      data: {
        status: "SUBMITTED",
        submittedAt: now,
        score: scoreResult.score,
        maxScore: scoreResult.maxScore,
        percent: Math.round(scoreResult.percent * 10) / 10,
        passed: isPassed,
      },
    });

    // 2. Upsert each scored answer
    for (const scored of scoreResult.answers) {
      const existing = await tx.attemptAnswer.findUnique({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId: scored.questionId,
          },
        },
      });

      if (existing) {
        await tx.attemptAnswer.update({
          where: { id: existing.id },
          data: {
            textAnswer: scored.textAnswer,
            isCorrect: scored.isCorrect,
            marksAwarded: scored.marksAwarded,
            selectedOptions: {
              set: scored.selectedOptionIds.map((id) => ({ id })),
            },
          },
        });
      } else {
        await tx.attemptAnswer.create({
          data: {
            attemptId,
            questionId: scored.questionId,
            textAnswer: scored.textAnswer,
            isCorrect: scored.isCorrect,
            marksAwarded: scored.marksAwarded,
            selectedOptions: {
              connect: scored.selectedOptionIds.map((id) => ({ id })),
            },
          },
        });
      }
    }

    // 3. If passed, mark testPassed in ModuleProgress
    if (isPassed) {
      await tx.moduleProgress.upsert({
        where: {
          userId_moduleId: {
            userId,
            moduleId: attempt.test.moduleId,
          },
        },
        create: {
          userId,
          moduleId: attempt.test.moduleId,
          testPassed: true,
        },
        update: {
          testPassed: true,
        },
      });
    }

    return updatedAttempt;
  });

  // Recompute module completion status
  await recomputeModuleCompletion(userId, attempt.test.moduleId);

  // Format per-question breakdown respecting revealAnswers policy
  const revealAnswers = attempt.test.revealAnswers;
  const breakdown = attempt.test.questions.map((q) => {
    const scored = scoreResult.answers.find((a) => a.questionId === q.id);

    return {
      questionId: q.id,
      prompt: q.prompt,
      type: q.type,
      marks: q.marks,
      marksAwarded: scored?.marksAwarded ?? 0,
      isCorrect: scored?.isCorrect ?? false,
      studentSelectedOptionIds: scored?.selectedOptionIds ?? [],
      studentTextAnswer: scored?.textAnswer ?? null,
      // Reveal answer key and explanation ONLY if revealAnswers is true
      explanation: revealAnswers ? q.explanation : null,
      correctOptionIds: revealAnswers
        ? q.options.filter((o) => o.isCorrect).map((o) => o.id)
        : null,
      acceptedAnswers: revealAnswers
        ? q.acceptedAnswers.map((a) => a.text)
        : null,
      options: q.options.map((o) => ({
        id: o.id,
        text: o.text,
        isCorrect: revealAnswers ? o.isCorrect : undefined,
      })),
    };
  });

  return NextResponse.json({
    result: {
      attemptId: finalResult.id,
      score: finalResult.score,
      maxScore: finalResult.maxScore,
      percent: finalResult.percent,
      passed: finalResult.passed,
      passPercent: attempt.test.passPercent,
      submittedAt: finalResult.submittedAt,
      revealAnswers,
      breakdown,
    },
  });
}
