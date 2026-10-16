import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    include: {
      enrollments: {
        include: {
          sport: true,
        },
      },
      moduleProgress: {
        where: { isCompleted: true },
        include: {
          module: {
            include: { sport: true },
          },
        },
      },
      attempts: {
        where: { status: "SUBMITTED" },
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

  const header = [
    "Student ID",
    "Student Name",
    "Email",
    "Active",
    "Sport",
    "Module Title",
    "Module Order",
    "Completed Date",
    "Latest Test Score (%)",
    "Test Passed",
  ].join(",");

  const rows: string[] = [];

  for (const student of students) {
    for (const prog of student.moduleProgress) {
      // Find latest attempt for this module test
      const testAttempt = student.attempts.find(
        (a) => a.test.moduleId === prog.moduleId
      );

      const row = [
        `"${student.id}"`,
        `"${student.name}"`,
        `"${student.email}"`,
        student.isActive ? "Yes" : "No",
        `"${prog.module.sport.name}"`,
        `"${prog.module.title.replace(/"/g, '""')}"`,
        prog.module.order,
        prog.completedAt ? prog.completedAt.toISOString().split("T")[0] : "",
        testAttempt?.percent !== undefined && testAttempt?.percent !== null
          ? testAttempt.percent
          : "N/A",
        testAttempt ? (testAttempt.passed ? "Yes" : "No") : "N/A",
      ];
      rows.push(row.join(","));
    }
  }

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lms_student_progress_${Date.now()}.csv"`,
    },
  });
}
