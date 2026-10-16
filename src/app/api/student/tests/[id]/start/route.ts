import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: testId } = await params;
  const userId = session.user.id;

  const test = await db.test.findUnique({
    where: { id: testId },
    include: {
      module: {
        include: {
          sport: true,
        },
      },
      questions: {
        orderBy: { order: "asc" },
        include: {
          options: {
            orderBy: { order: "asc" },
            // CRITICAL: do NOT select isCorrect here!
            select: {
              id: true,
              text: true,
              order: true,
            },
          },
          // CRITICAL: do NOT select acceptedAnswers or explanation!
        },
      },
    },
  });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  // Check max attempts
  if (test.maxAttempts !== null) {
    const attemptsCount = await db.attempt.count({
      where: {
        userId,
        testId,
        status: "SUBMITTED",
      },
    });

    if (attemptsCount >= test.maxAttempts) {
      return NextResponse.json(
        { error: `You have reached the maximum of ${test.maxAttempts} attempts for this test.` },
        { status: 403 }
      );
    }
  }

  // Check if there is an existing active IN_PROGRESS attempt
  const existingAttempt = await db.attempt.findFirst({
    where: {
      userId,
      testId,
      status: "IN_PROGRESS",
    },
    include: {
      answers: true,
    },
  });

  const now = new Date();
  const graceSec = Number(process.env.TEST_SUBMISSION_GRACE_PERIOD_SEC ?? 30);

  let attempt = existingAttempt;

  // If existing attempt expired, mark it expired
  if (attempt && attempt.expiresAt && now > new Date(attempt.expiresAt.getTime() + graceSec * 1000)) {
    await db.attempt.update({
      where: { id: attempt.id },
      data: { status: "EXPIRED" },
    });
    attempt = null;
  }

  // Create new attempt if needed
  if (!attempt) {
    const expiresAt = test.timeLimitSec
      ? new Date(now.getTime() + test.timeLimitSec * 1000)
      : null;

    attempt = await db.attempt.create({
      data: {
        userId,
        testId,
        status: "IN_PROGRESS",
        startedAt: now,
        expiresAt,
      },
      include: {
        answers: true,
      },
    });
  }

  // Sanitize and format questions
  let sanitizedQuestions = test.questions.map((q) => {
    let options = q.options;
    if (test.shuffleOptions) {
      options = shuffleArray(options);
    }

    return {
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      imageUrl: q.imageUrl,
      marks: q.marks,
      order: q.order,
      options,
    };
  });

  if (test.shuffleQuestions) {
    sanitizedQuestions = shuffleArray(sanitizedQuestions);
  }

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      testId: test.id,
      testTitle: test.title,
      moduleTitle: test.module.title,
      sportName: test.module.sport.name,
      timeLimitSec: test.timeLimitSec,
      passPercent: test.passPercent,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      answers: attempt.answers.map((a) => ({
        questionId: a.questionId,
        textAnswer: a.textAnswer,
        isFlagged: a.isFlagged,
      })),
    },
    questions: sanitizedQuestions,
  });
}
