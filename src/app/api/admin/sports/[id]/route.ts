import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { updateSportSchema } from "@/lib/validations";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const sport = await db.sport.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          test: {
            include: {
              _count: { select: { questions: true, attempts: true } },
            },
          },
          video: true,
          _count: { select: { moduleProgress: true } },
        },
      },
      _count: {
        select: { enrollments: true },
      },
    },
  });

  if (!sport) {
    return NextResponse.json({ error: "Sport not found" }, { status: 404 });
  }

  return NextResponse.json({ sport });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  }

  const updated = await db.sport.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ sport: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await db.sport.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
