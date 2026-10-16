import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { updateModuleSchema } from "@/lib/validations";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const mod = await db.module.findUnique({
    where: { id },
    include: {
      sport: true,
      video: true,
      test: {
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: {
              options: { orderBy: { order: "asc" } },
              acceptedAnswers: true,
            },
          },
        },
      },
      attachments: true,
    },
  });

  if (!mod) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  return NextResponse.json({ module: mod });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateModuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  }

  const updated = await db.module.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ module: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await db.module.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
