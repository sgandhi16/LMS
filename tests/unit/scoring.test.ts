import { describe, it, expect } from "vitest";
import {
  normalizeText,
  matchShortAnswer,
  scoreMcqSingle,
  scoreMcqMulti,
  scoreAttempt,
  computePassFail,
} from "../../src/lib/scoring";
import { QuestionType } from "@prisma/client";

describe("Scoring Engine - Text Normalization & Fuzzy Matching", () => {
  it("normalizes text by trimming whitespace and lowercasing", () => {
    expect(normalizeText("  Boxing  ", { caseInsensitive: true, trimWhitespace: true })).toBe("boxing");
    expect(normalizeText("TENNIS", { caseInsensitive: true, trimWhitespace: true })).toBe("tennis");
  });

  it("respects case sensitivity flag", () => {
    expect(normalizeText("Boxing", { caseInsensitive: false, trimWhitespace: true })).toBe("Boxing");
  });

  it("matches exact short answers", () => {
    const accepted = [
      { text: "boxing", caseInsensitive: true, trimWhitespace: true, fuzzyMatch: false, levenshteinThreshold: 1 },
    ];
    expect(matchShortAnswer("boxing", accepted)).toBe(true);
    expect(matchShortAnswer(" Boxing ", accepted)).toBe(true);
    expect(matchShortAnswer("BOXING", accepted)).toBe(true);
    expect(matchShortAnswer("football", accepted)).toBe(false);
  });

  it("matches short answers with Levenshtein fuzzy match within threshold", () => {
    const accepted = [
      { text: "boxing", caseInsensitive: true, trimWhitespace: true, fuzzyMatch: true, levenshteinThreshold: 1 },
    ];
    // Distance 1: typo 'boxin' or 'boxng'
    expect(matchShortAnswer("boxin", accepted)).toBe(true);
    expect(matchShortAnswer("boxng", accepted)).toBe(true);
    expect(matchShortAnswer("boxinng", accepted)).toBe(true);
    // Distance 2: should fail when threshold is 1
    expect(matchShortAnswer("box", accepted)).toBe(false);
  });
});

describe("Scoring Engine - MCQ Single", () => {
  const options = [
    { id: "opt-1", isCorrect: true },
    { id: "opt-2", isCorrect: false },
    { id: "opt-3", isCorrect: false },
  ];

  it("awards correct when selecting the right option", () => {
    expect(scoreMcqSingle(["opt-1"], options)).toBe(true);
  });

  it("rejects wrong option", () => {
    expect(scoreMcqSingle(["opt-2"], options)).toBe(false);
  });

  it("rejects multiple selections for single-choice", () => {
    expect(scoreMcqSingle(["opt-1", "opt-2"], options)).toBe(false);
  });

  it("rejects empty selection", () => {
    expect(scoreMcqSingle([], options)).toBe(false);
  });
});

describe("Scoring Engine - MCQ Multi", () => {
  const options = [
    { id: "opt-1", isCorrect: true },
    { id: "opt-2", isCorrect: true },
    { id: "opt-3", isCorrect: false },
    { id: "opt-4", isCorrect: false },
  ];

  it("awards correct only when ALL correct options are selected and no wrong ones", () => {
    expect(scoreMcqMulti(["opt-1", "opt-2"], options)).toBe(true);
  });

  it("rejects partial selection", () => {
    expect(scoreMcqMulti(["opt-1"], options)).toBe(false);
  });

  it("rejects when an extra wrong option is selected", () => {
    expect(scoreMcqMulti(["opt-1", "opt-2", "opt-3"], options)).toBe(false);
  });
});

describe("Scoring Engine - Complete Attempt Scoring & Pass/Fail", () => {
  const questions = [
    {
      id: "q1",
      type: QuestionType.MCQ_SINGLE,
      marks: 2,
      options: [
        { id: "o1", isCorrect: true },
        { id: "o2", isCorrect: false },
      ],
      acceptedAnswers: [],
    },
    {
      id: "q2",
      type: QuestionType.MCQ_MULTI,
      marks: 3,
      options: [
        { id: "o3", isCorrect: true },
        { id: "o4", isCorrect: true },
        { id: "o5", isCorrect: false },
      ],
      acceptedAnswers: [],
    },
    {
      id: "q3",
      type: QuestionType.SHORT_ANSWER,
      marks: 1,
      options: [],
      acceptedAnswers: [
        { text: "tennis", caseInsensitive: true, trimWhitespace: true, fuzzyMatch: true, levenshteinThreshold: 1 },
      ],
    },
  ];

  it("correctly scores a 100% attempt", () => {
    const submitted = [
      { questionId: "q1", selectedOptionIds: ["o1"] },
      { questionId: "q2", selectedOptionIds: ["o3", "o4"] },
      { questionId: "q3", textAnswer: "Tennis" },
    ];

    const result = scoreAttempt(questions, submitted);
    expect(result.score).toBe(6);
    expect(result.maxScore).toBe(6);
    expect(result.percent).toBe(100);
    expect(computePassFail(result.percent, 70)).toBe(true);
  });

  it("correctly calculates partial score and pass threshold", () => {
    const submitted = [
      { questionId: "q1", selectedOptionIds: ["o1"] }, // 2 marks
      { questionId: "q2", selectedOptionIds: ["o3"] }, // 0 marks (incomplete)
      { questionId: "q3", textAnswer: "wrong" },       // 0 marks
    ];

    const result = scoreAttempt(questions, submitted);
    expect(result.score).toBe(2);
    expect(result.maxScore).toBe(6);
    expect(Math.round(result.percent)).toBe(33);
    expect(computePassFail(result.percent, 70)).toBe(false);
  });
});
