import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { createTestSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = createTestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await db.test.findUnique({
    where: { moduleId: parsed.data.moduleId },
  });
  if (existing) {
    return NextResponse.json({ error: "A test already exists for this module" }, { status: 409 });
  }

  const test = await db.test.create({
    data: parsed.data,
  });

  return NextResponse.json({ test }, { status: 201 });
}
