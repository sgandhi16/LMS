"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  HelpCircle,
  Award,
} from "lucide-react";
import { CircularProgress } from "@/components/shared/progress-ring";

interface QuestionBreakdown {
  questionId: string;
  prompt: string;
  type: string;
  marks: number;
  marksAwarded: number;
  isCorrect: boolean;
  studentSelectedOptionIds: string[];
  studentTextAnswer: string | null;
  explanation: string | null;
  correctOptionIds: string[] | null;
  acceptedAnswers: string[] | null;
  options: Array<{ id: string; text: string; isCorrect?: boolean }>;
}

interface ResultsScreenProps {
  result: {
    attemptId: string;
    score: number;
    maxScore: number;
    percent: number;
    passed: boolean;
    passPercent: number;
    submittedAt: string;
    revealAnswers: boolean;
    breakdown: QuestionBreakdown[];
  };
  testTitle: string;
  sportName: string;
  onRetake: () => void;
  onExit: () => void;
}

export function ResultsScreen({
  result,
  testTitle,
  sportName,
  onRetake,
  onExit,
}: ResultsScreenProps) {
  // Fire confetti if passed
  useEffect(() => {
    if (result.passed) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"],
        });
      } catch (err) {
        console.error("Confetti error:", err);
      }
    }
  }, [result.passed]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-in fade-in duration-300">
      {/* Score Summary Card */}
      <div className="glass-panel rounded-3xl p-8 mb-8 text-center relative overflow-hidden shadow-2xl border border-white/10">
        <div className="flex flex-col items-center">
          <div className="mb-4">
            <CircularProgress
              progress={result.percent}
              size={120}
              strokeWidth={10}
              color={result.passed ? "#10b981" : "#ef4444"}
            />
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-extrabold uppercase tracking-wider mb-3 ${
              result.passed
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 glow-success"
                : "bg-red-500/20 text-red-400 border border-red-500/40 glow-danger"
            }`}
          >
            {result.passed ? (
              <>
                <Award className="w-4 h-4" />
                <span>Passed Assessment</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>Did Not Pass</span>
              </>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
            {testTitle}
          </h1>
          <p className="text-sm text-slate-400 max-w-md">
            {result.passed
              ? "Outstanding performance! You met the passing standard and unlocked your next milestone."
              : `You achieved ${result.percent}%. A score of ${result.passPercent}% is required to pass.`}
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-6 pt-6 border-t border-white/10">
            <div className="p-3 rounded-xl bg-slate-900/60">
              <span className="text-xs text-slate-400">Total Marks</span>
              <p className="text-xl font-black text-white">
                {result.score} / {result.maxScore}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60">
              <span className="text-xs text-slate-400">Percentage</span>
              <p className="text-xl font-black text-blue-400">
                {result.percent}%
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60">
              <span className="text-xs text-slate-400">Pass Mark</span>
              <p className="text-xl font-black text-slate-300">
                {result.passPercent}%
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <button
              onClick={onRetake}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-sm font-semibold hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Test</span>
            </button>

            <button
              onClick={onExit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-900/30 transition-all"
            >
              <span>Return to Course</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Per-Question Breakdown */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-lg font-black text-white">Question Breakdown</h2>
          <span className="text-xs text-slate-400">
            {result.breakdown.filter((q) => q.isCorrect).length} of{" "}
            {result.breakdown.length} correct
          </span>
        </div>

        {result.breakdown.map((q, idx) => (
          <div
            key={q.questionId}
            className={`glass-panel rounded-2xl p-6 border transition-all ${
              q.isCorrect
                ? "border-emerald-500/20 bg-emerald-950/10"
                : "border-red-500/20 bg-red-950/10"
            }`}
          >
            <div className="flex justify-between items-start gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400">
                  Q{idx + 1}.
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/5 text-slate-300 uppercase">
                  {q.type}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">
                  {q.marksAwarded} / {q.marks} pts
                </span>
                {q.isCorrect ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> Correct
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-red-400">
                    <XCircle className="w-4 h-4" /> Incorrect
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm font-bold text-white mb-4">{q.prompt}</p>

            {/* Answer Display */}
            {q.type === "SHORT_ANSWER" ? (
              <div className="text-xs space-y-2 p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <p>
                  <span className="text-slate-400">Your Answer: </span>
                  <strong className="text-white">
                    {q.studentTextAnswer || "(none)"}
                  </strong>
                </p>
                {result.revealAnswers && q.acceptedAnswers && (
                  <p>
                    <span className="text-slate-400">Accepted Answers: </span>
                    <strong className="text-emerald-400">
                      {q.acceptedAnswers.join(", ")}
                    </strong>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const wasSelected = q.studentSelectedOptionIds.includes(opt.id);
                  const isAnswerKey =
                    result.revealAnswers && q.correctOptionIds?.includes(opt.id);

                  return (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                        isAnswerKey
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                          : wasSelected && !q.isCorrect
                          ? "bg-red-500/15 border-red-500/40 text-red-200"
                          : "bg-slate-900/40 border-white/5 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {wasSelected && (
                          <span className="font-semibold text-white">Your pick:</span>
                        )}
                        <span>{opt.text}</span>
                      </div>

                      {isAnswerKey && (
                        <span className="font-bold text-emerald-400">
                          ✓ Correct Answer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Explanation when reveal answers policy is enabled */}
            {result.revealAnswers && q.explanation && (
              <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                <div>
                  <span className="font-bold text-blue-300">Explanation: </span>
                  <span>{q.explanation}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
