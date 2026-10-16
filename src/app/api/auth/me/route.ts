import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "User not found or inactive" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
