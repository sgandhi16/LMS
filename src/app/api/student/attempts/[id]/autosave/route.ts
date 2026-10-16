import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { submittedAnswerSchema } from "@/lib/validations";
import { z } from "zod";

const autosaveSchema = z.object({
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

  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
  });

  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "Attempt is already submitted or expired" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = autosaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid autosave payload" }, { status: 400 });
  }

  const { answers } = parsed.data;

  // Upsert answers
  for (const ans of answers) {
    const existing = await db.attemptAnswer.findUnique({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId: ans.questionId,
        },
      },
    });

    if (existing) {
      await db.attemptAnswer.update({
        where: { id: existing.id },
        data: {
          textAnswer: ans.textAnswer ?? null,
          isFlagged: ans.isFlagged ?? false,
          selectedOptions: {
            set: (ans.selectedOptionIds ?? []).map((id) => ({ id })),
          },
        },
      });
    } else {
      await db.attemptAnswer.create({
        data: {
          attemptId,
          questionId: ans.questionId,
          textAnswer: ans.textAnswer ?? null,
          isFlagged: ans.isFlagged ?? false,
          selectedOptions: {
            connect: (ans.selectedOptionIds ?? []).map((id) => ({ id })),
          },
        },
      });
    }
  }

  return NextResponse.json({ success: true, savedAt: new Date() });
}
