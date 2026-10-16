import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { reorderModulesSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = reorderModulesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  }

  const { sportId, moduleIds } = parsed.data;

  // Update order in transaction
  await db.$transaction(
    moduleIds.map((id, index) =>
      db.module.update({
        where: { id, sportId },
        data: { order: index + 1 },
      })
    )
  );

  return NextResponse.json({ success: true, count: moduleIds.length });
}
