import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const question = await db.question.findUnique({
    where: { id },
    include: {
      options: { orderBy: { order: "asc" } },
      acceptedAnswers: true,
      test: true,
    },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json({ question });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const updated = await db.$transaction(async (tx) => {
    // Update base fields
    const q = await tx.question.update({
      where: { id },
      data: {
        prompt: body.prompt,
        marks: body.marks !== undefined ? Number(body.marks) : undefined,
        explanation: body.explanation,
        imageUrl: body.imageUrl,
        order: body.order !== undefined ? Number(body.order) : undefined,
      },
    });

    // If options provided for MCQ
    if (body.options && Array.isArray(body.options)) {
      await tx.option.deleteMany({ where: { questionId: id } });
      await tx.option.createMany({
        data: body.options.map((opt: { text: string; isCorrect: boolean; order?: number }, i: number) => ({
          questionId: id,
          text: opt.text,
          isCorrect: opt.isCorrect,
          order: opt.order ?? i + 1,
        })),
      });
    }

    // If acceptedAnswers provided for Short Answer
    if (body.acceptedAnswers && Array.isArray(body.acceptedAnswers)) {
      await tx.acceptedAnswer.deleteMany({ where: { questionId: id } });
      await tx.acceptedAnswer.createMany({
        data: body.acceptedAnswers.map((ans: {
          text: string;
          caseInsensitive?: boolean;
          trimWhitespace?: boolean;
          fuzzyMatch?: boolean;
          levenshteinThreshold?: number;
        }) => ({
          questionId: id,
          text: ans.text,
          caseInsensitive: ans.caseInsensitive ?? true,
          trimWhitespace: ans.trimWhitespace ?? true,
          fuzzyMatch: ans.fuzzyMatch ?? false,
          levenshteinThreshold: ans.levenshteinThreshold ?? 2,
        })),
      });
    }

    return tx.question.findUnique({
      where: { id },
      include: {
        options: { orderBy: { order: "asc" } },
        acceptedAnswers: true,
      },
    });
  });

  return NextResponse.json({ question: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await db.question.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
