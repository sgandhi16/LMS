import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getStudentSportProgress } from "@/lib/progress";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          sport: true,
        },
      },
      attempts: {
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        include: {
          test: {
            include: {
              module: { include: { sport: true } },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Get progress per sport
  const sportsProgress = await getStudentSportProgress(id);

  // All published sports to allow enrolling
  const allSports = await db.sport.findMany({
    where: { isPublished: true },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({
    student: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      sportsProgress,
      allSports,
      attempts: user.attempts.map((a) => ({
        id: a.id,
        testTitle: a.test.title,
        moduleTitle: a.test.module.title,
        sportName: a.test.module.sport.name,
        score: a.score,
        maxScore: a.maxScore,
        percent: a.percent,
        passed: a.passed,
        submittedAt: a.submittedAt,
      })),
    },
  });
}

// Update student status (deactivate/activate or change role)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      ...(body.role !== undefined ? { role: body.role } : {}),
    },
  });

  return NextResponse.json({ student: updated });
}

// Enroll / Unenroll student from sport
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: userId } = await params;
  const body = await req.json().catch(() => null);

  if (body.action === "enroll") {
    const sportId = body.sportId;
    const enrollment = await db.enrollment.upsert({
      where: { userId_sportId: { userId, sportId } },
      create: { userId, sportId },
      update: {},
    });
    return NextResponse.json({ success: true, enrollment });
  }

  if (body.action === "unenroll") {
    const sportId = body.sportId;
    await db.enrollment.deleteMany({
      where: { userId, sportId },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
