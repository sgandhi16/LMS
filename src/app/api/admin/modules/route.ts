import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { createModuleSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = createModuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  }

  // Find max order for this sport if order not specified or conflicts
  const maxOrder = await db.module.aggregate({
    where: { sportId: parsed.data.sportId },
    _max: { order: true },
  });

  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  const mod = await db.module.create({
    data: {
      ...parsed.data,
      order: parsed.data.order ?? nextOrder,
    },
  });

  return NextResponse.json({ module: mod }, { status: 201 });
}
