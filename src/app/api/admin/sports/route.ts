import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { createSportSchema } from "@/lib/validations";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const sports = await db.sport.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          modules: true,
          enrollments: true,
        },
      },
    },
  });

  return NextResponse.json({ sports });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = createSportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await db.sport.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (existing) {
    return NextResponse.json({ error: "A sport with this slug already exists" }, { status: 409 });
  }

  const sport = await db.sport.create({
    data: parsed.data,
  });

  return NextResponse.json({ sport }, { status: 201 });
}
