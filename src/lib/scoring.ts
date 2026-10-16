/**
 * Server-side scoring engine.
 * CRITICAL: This module NEVER runs in the browser.
 * Correct answers are fetched from DB and compared server-side only.
 */
import levenshtein from "fast-levenshtein";
import { QuestionType } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────

export interface QuestionWithAnswers {
  id: string;
  type: QuestionType;
  marks: number;
  options: Array<{ id: string; isCorrect: boolean }>;
  acceptedAnswers: Array<{
    text: string;
    caseInsensitive: boolean;
    trimWhitespace: boolean;
    fuzzyMatch: boolean;
    levenshteinThreshold: number;
  }>;
}

export interface SubmittedAnswer {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
}

export interface ScoredAnswer {
  questionId: string;
  isCorrect: boolean;
  marksAwarded: number;
  selectedOptionIds: string[];
  textAnswer: string | null;
}

export interface ScoreResult {
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  answers: ScoredAnswer[];
}

// ─── Short Answer Normalization ────────────────────────────────────

export function normalizeText(
  text: string,
  { caseInsensitive = true, trimWhitespace = true }: { caseInsensitive?: boolean; trimWhitespace?: boolean }
): string {
  let result = text;
  if (trimWhitespace) result = result.trim();
  if (caseInsensitive) result = result.toLowerCase();
  return result;
}

export function matchShortAnswer(
  studentAnswer: string,
  acceptedAnswers: QuestionWithAnswers["acceptedAnswers"]
): boolean {
  for (const accepted of acceptedAnswers) {
    const normalize = (s: string) =>
      normalizeText(s, {
        caseInsensitive: accepted.caseInsensitive,
        trimWhitespace: accepted.trimWhitespace,
      });

    const normStudent = normalize(studentAnswer);
    const normAccepted = normalize(accepted.text);

    if (accepted.fuzzyMatch) {
      const distance = levenshtein.get(normStudent, normAccepted);
      if (distance <= accepted.levenshteinThreshold) return true;
    } else {
      if (normStudent === normAccepted) return true;
    }
  }
  return false;
}

// ─── MCQ Scoring ──────────────────────────────────────────────────

export function scoreMcqSingle(
  selectedOptionIds: string[],
  options: QuestionWithAnswers["options"]
): boolean {
  if (selectedOptionIds.length !== 1) return false;
  const selectedId = selectedOptionIds[0];
  const correctOption = options.find((o) => o.isCorrect);
  return correctOption?.id === selectedId;
}

export function scoreMcqMulti(
  selectedOptionIds: string[],
  options: QuestionWithAnswers["options"]
): boolean {
  const correctIds = new Set(options.filter((o) => o.isCorrect).map((o) => o.id));
  const selectedSet = new Set(selectedOptionIds);

  if (correctIds.size !== selectedSet.size) return false;
  for (const id of correctIds) {
    if (!selectedSet.has(id)) return false;
  }
  return true;
}

// ─── Main Scoring Function ────────────────────────────────────────

export function scoreAttempt(
  questions: QuestionWithAnswers[],
  submittedAnswers: SubmittedAnswer[]
): ScoreResult {
  const answerMap = new Map<string, SubmittedAnswer>();
  for (const answer of submittedAnswers) {
    answerMap.set(answer.questionId, answer);
  }

  let score = 0;
  const maxScore = questions.reduce((sum, q) => sum + q.marks, 0);
  const answers: ScoredAnswer[] = [];

  for (const question of questions) {
    const submitted = answerMap.get(question.id);
    const selectedOptionIds = submitted?.selectedOptionIds ?? [];
    const textAnswer = submitted?.textAnswer ?? null;
    let isCorrect = false;

    switch (question.type) {
      case QuestionType.MCQ_SINGLE:
        isCorrect = scoreMcqSingle(selectedOptionIds, question.options);
        break;
      case QuestionType.MCQ_MULTI:
        isCorrect = scoreMcqMulti(selectedOptionIds, question.options);
        break;
      case QuestionType.SHORT_ANSWER:
        isCorrect = textAnswer
          ? matchShortAnswer(textAnswer, question.acceptedAnswers)
          : false;
        break;
    }

    const marksAwarded = isCorrect ? question.marks : 0;
    score += marksAwarded;

    answers.push({
      questionId: question.id,
      isCorrect,
      marksAwarded,
      selectedOptionIds,
      textAnswer,
    });
  }

  const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;

  return { score, maxScore, percent, passed: false, answers };
}

export function computePassFail(percent: number, passPercent: number): boolean {
  return percent >= passPercent;
}
