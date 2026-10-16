import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { createQuestionSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = createQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;

  // Transaction to create question + options or accepted answers
  const question = await db.$transaction(async (tx) => {
    const q = await tx.question.create({
      data: {
        testId: data.testId,
        type: data.type,
        prompt: data.prompt,
        imageUrl: data.imageUrl ?? null,
        marks: data.marks,
        explanation: data.explanation ?? null,
        order: data.order,
      },
    });

    if (data.type === "MCQ_SINGLE" || data.type === "MCQ_MULTI") {
      await tx.option.createMany({
        data: data.options.map((opt, i) => ({
          questionId: q.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
          order: opt.order ?? i + 1,
        })),
      });
    } else if (data.type === "SHORT_ANSWER") {
      await tx.acceptedAnswer.createMany({
        data: data.acceptedAnswers.map((ans) => ({
          questionId: q.id,
          text: ans.text,
          caseInsensitive: ans.caseInsensitive ?? true,
          trimWhitespace: ans.trimWhitespace ?? true,
          fuzzyMatch: ans.fuzzyMatch ?? false,
          levenshteinThreshold: ans.levenshteinThreshold ?? 2,
        })),
      });
    }

    return tx.question.findUnique({
      where: { id: q.id },
      include: {
        options: { orderBy: { order: "asc" } },
        acceptedAnswers: true,
      },
    });
  });

  return NextResponse.json({ question }, { status: 201 });
}
