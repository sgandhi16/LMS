import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const enrollSchema = z.object({
  sportId: z.string().cuid(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sport ID" }, { status: 400 });
  }

  const { sportId } = parsed.data;

  // Verify sport exists and is published
  const sport = await db.sport.findUnique({
    where: { id: sportId, isPublished: true },
  });

  if (!sport) {
    return NextResponse.json({ error: "Sport not found" }, { status: 404 });
  }

  // Create enrollment if not already enrolled
  const enrollment = await db.enrollment.upsert({
    where: {
      userId_sportId: {
        userId: session.user.id,
        sportId,
      },
    },
    create: {
      userId: session.user.id,
      sportId,
    },
    update: {},
  });

  return NextResponse.json({ success: true, enrollment });
}
