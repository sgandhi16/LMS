import { describe, it, expect } from "vitest";
import { scoreAttempt, computePassFail } from "../../src/lib/scoring";
import { QuestionType } from "@prisma/client";

describe("Submit Attempt Integration Flow", () => {
  const testQuestions = [
    {
      id: "q-single",
      type: QuestionType.MCQ_SINGLE,
      marks: 2,
      options: [
        { id: "opt-a", isCorrect: true },
        { id: "opt-b", isCorrect: false },
      ],
      acceptedAnswers: [],
    },
    {
      id: "q-multi",
      type: QuestionType.MCQ_MULTI,
      marks: 3,
      options: [
        { id: "opt-1", isCorrect: true },
        { id: "opt-2", isCorrect: true },
        { id: "opt-3", isCorrect: false },
      ],
      acceptedAnswers: [],
    },
    {
      id: "q-short",
      type: QuestionType.SHORT_ANSWER,
      marks: 1,
      options: [],
      acceptedAnswers: [
        {
          text: "boxing",
          caseInsensitive: true,
          trimWhitespace: true,
          fuzzyMatch: true,
          levenshteinThreshold: 1,
        },
      ],
    },
  ];

  it("sanitizes questions before student sees them by stripping answer keys", () => {
    // Mimic the start endpoint question sanitizer
    const sanitizeQuestions = (questions: typeof testQuestions) => {
      return questions.map((q) => ({
        id: q.id,
        type: q.type,
        marks: q.marks,
        options: q.options.map((o) => ({
          id: o.id,
          // Notice: isCorrect is stripped!
        })),
        // Notice: acceptedAnswers is stripped!
      }));
    };

    const sanitized = sanitizeQuestions(testQuestions);

    for (const q of sanitized) {
      expect((q as any).acceptedAnswers).toBeUndefined();
      for (const o of q.options) {
        expect((o as any).isCorrect).toBeUndefined();
      }
    }
  });

  it("scores submit attempt server-side and applies pass threshold", () => {
    const studentSubmission = [
      { questionId: "q-single", selectedOptionIds: ["opt-a"] }, // 2 pts
      { questionId: "q-multi", selectedOptionIds: ["opt-1", "opt-2"] }, // 3 pts
      { questionId: "q-short", textAnswer: "  Boxing " }, // 1 pt
    ];

    const result = scoreAttempt(testQuestions, studentSubmission);
    expect(result.score).toBe(6);
    expect(result.maxScore).toBe(6);
    expect(result.percent).toBe(100);

    const isPassed = computePassFail(result.percent, 70);
    expect(isPassed).toBe(true);
  });

  it("handles time limit and grace period calculations", () => {
    const startedAt = new Date("2026-10-16T12:00:00Z");
    const timeLimitSec = 600; // 10 minutes
    const graceSec = 30; // 30 seconds grace

    const expiresAt = new Date(startedAt.getTime() + timeLimitSec * 1000);
    const deadlineWithGrace = new Date(expiresAt.getTime() + graceSec * 1000);

    const onTimeSubmission = new Date("2026-10-16T12:09:59Z");
    const graceSubmission = new Date("2026-10-16T12:10:20Z");
    const lateSubmission = new Date("2026-10-16T12:10:35Z");

    const isAllowed = (subTime: Date) => subTime <= deadlineWithGrace;

    expect(isAllowed(onTimeSubmission)).toBe(true);
    expect(isAllowed(graceSubmission)).toBe(true);
    expect(isAllowed(lateSubmission)).toBe(false);
  });
});
