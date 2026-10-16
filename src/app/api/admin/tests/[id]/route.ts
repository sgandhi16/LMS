import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { updateTestSchema } from "@/lib/validations";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const test = await db.test.findUnique({
    where: { id },
    include: {
      module: {
        include: { sport: true },
      },
      questions: {
        orderBy: { order: "asc" },
        include: {
          options: { orderBy: { order: "asc" } },
          acceptedAnswers: true,
        },
      },
      _count: {
        select: { attempts: true },
      },
    },
  });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  return NextResponse.json({ test });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateTestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  }

  const updated = await db.test.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ test: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await db.test.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
