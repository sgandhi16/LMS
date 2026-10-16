import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { parse } from "csv-parse/sync";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const contentType = req.headers.get("content-type") || "";
  let testId: string | null = null;
  let rows: Array<Record<string, string>> = [];

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    if (!body?.testId || !Array.isArray(body?.questions)) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    testId = body.testId;
    rows = body.questions;
  } else if (contentType.includes("multipart/form-data") || contentType.includes("text/csv")) {
    const formData = await req.formData();
    testId = formData.get("testId") as string;
    const file = formData.get("file") as File;

    if (!testId || !file) {
      return NextResponse.json({ error: "Missing testId or CSV file" }, { status: 400 });
    }

    const text = await file.text();
    try {
      rows = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "CSV parse error";
      return NextResponse.json({ error: `CSV Parse error: ${message}` }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
  }

  if (!testId) {
    return NextResponse.json({ error: "Missing testId" }, { status: 400 });
  }

  const validTestId: string = testId;

  const test = await db.test.findUnique({
    where: { id: validTestId },
  });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const existingCount = await db.question.count({
    where: { testId: validTestId },
  });

  let currentOrder = existingCount;
  let importedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const type = row.type?.toUpperCase()?.trim();
    const prompt = row.prompt?.trim();
    const marks = Number(row.marks) || 1;
    const explanation = row.explanation?.trim() || null;

    if (!prompt) {
      errors.push(`Row ${rowNum}: Prompt is required`);
      continue;
    }

    if (!["MCQ_SINGLE", "MCQ_MULTI", "SHORT_ANSWER"].includes(type)) {
      errors.push(`Row ${rowNum}: Invalid type '${type}'. Must be MCQ_SINGLE, MCQ_MULTI, or SHORT_ANSWER`);
      continue;
    }

    currentOrder++;

    try {
      if (type === "MCQ_SINGLE" || type === "MCQ_MULTI") {
        const optionA = row.option_a?.trim();
        const optionB = row.option_b?.trim();
        const optionC = row.option_c?.trim();
        const optionD = row.option_d?.trim();

        const rawOptions = [
          { text: optionA, key: "a" },
          { text: optionB, key: "b" },
          { text: optionC, key: "c" },
          { text: optionD, key: "d" },
        ].filter((o) => !!o.text);

        if (rawOptions.length < 2) {
          errors.push(`Row ${rowNum}: MCQ must have at least 2 options (option_a and option_b)`);
          continue;
        }

        const correctKeys = (row.correct_options || "")
          .toLowerCase()
          .split(",")
          .map((k) => k.trim());

        if (correctKeys.length === 0 || !correctKeys[0]) {
          errors.push(`Row ${rowNum}: correct_options is required (e.g. 'a' or 'a,b')`);
          continue;
        }

        await db.$transaction(async (tx) => {
          const q = await tx.question.create({
            data: {
              testId: validTestId,
              type: type as "MCQ_SINGLE" | "MCQ_MULTI",
              prompt,
              marks,
              explanation,
              order: currentOrder,
            },
          });

          await tx.option.createMany({
            data: rawOptions.map((opt, idx) => ({
              questionId: q.id,
              text: opt.text!,
              isCorrect: correctKeys.includes(opt.key),
              order: idx + 1,
            })),
          });
        });

        importedCount++;
      } else if (type === "SHORT_ANSWER") {
        const answersStr = row.accepted_answers || "";
        const answersList = answersStr
          .split("|")
          .map((a) => a.trim())
          .filter(Boolean);

        if (answersList.length === 0) {
          errors.push(`Row ${rowNum}: accepted_answers is required (pipe-separated e.g. 'boxing|box')`);
          continue;
        }

        const fuzzy = row.fuzzy_match === "true" || row.fuzzy_match === "1";
        const threshold = Number(row.levenshtein_threshold) || 2;

        await db.$transaction(async (tx) => {
          const q = await tx.question.create({
            data: {
              testId: validTestId,
              type: "SHORT_ANSWER",
              prompt,
              marks,
              explanation,
              order: currentOrder,
            },
          });

          await tx.acceptedAnswer.createMany({
            data: answersList.map((text) => ({
              questionId: q.id,
              text,
              caseInsensitive: true,
              trimWhitespace: true,
              fuzzyMatch: fuzzy,
              levenshteinThreshold: threshold,
            })),
          });
        });

        importedCount++;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      errors.push(`Row ${rowNum}: Database error: ${message}`);
    }
  }

  return NextResponse.json({
    success: true,
    importedCount,
    errors,
  });
}
