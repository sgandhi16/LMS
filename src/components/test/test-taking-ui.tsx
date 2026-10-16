"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Send,
  HelpCircle,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { LinearProgress } from "@/components/shared/progress-ring";
import { ResultsScreen } from "./results-screen";

interface Option {
  id: string;
  text: string;
  order: number;
}

interface Question {
  id: string;
  type: "MCQ_SINGLE" | "MCQ_MULTI" | "SHORT_ANSWER";
  prompt: string;
  imageUrl?: string | null;
  marks: number;
  order: number;
  options: Option[];
}

interface AttemptAnswerState {
  questionId: string;
  selectedOptionIds: string[];
  textAnswer: string;
  isFlagged: boolean;
}

interface TestTakingProps {
  testId: string;
  onExit: () => void;
}

export function TestTakingUI({ testId, onExit }: TestTakingProps) {
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<{
    id: string;
    testTitle: string;
    moduleTitle: string;
    sportName: string;
    timeLimitSec: number | null;
    passPercent: number;
    startedAt: string;
    expiresAt: string | null;
  } | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AttemptAnswerState>>({});
  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>("All changes saved");
  const [scoredResult, setScoredResult] = useState<any | null>(null);

  // 1. Initialize Test Attempt & Load Sanitized Questions
  useEffect(() => {
    async function startTest() {
      try {
        const res = await fetch(`/api/student/tests/${testId}/start`, {
          method: "POST",
        });

        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || "Failed to start test");
          onExit();
          return;
        }

        const data = await res.json();
        setAttempt(data.attempt);
        setQuestions(data.questions);

        // Populate initial answers state
        const initialAnswers: Record<string, AttemptAnswerState> = {};
        for (const q of data.questions) {
          const existing = data.attempt.answers.find(
            (a: any) => a.questionId === q.id
          );
          initialAnswers[q.id] = {
            questionId: q.id,
            selectedOptionIds: existing?.selectedOptionIds || [],
            textAnswer: existing?.textAnswer || "",
            isFlagged: existing?.isFlagged || false,
          };
        }
        setAnswers(initialAnswers);

        // Setup timer if timeLimit exists
        if (data.attempt.expiresAt) {
          const expiresTime = new Date(data.attempt.expiresAt).getTime();
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((expiresTime - now) / 1000));
          setTimeLeftSec(remaining);
        }

        setLoading(false);
      } catch (err) {
        console.error("Test start error:", err);
        toast.error("Network error starting test");
        onExit();
      }
    }

    startTest();
  }, [testId, onExit]);

  // Answer modification handlers
  const handleOptionSelect = (
    qId: string,
    optionId: string,
    type: "MCQ_SINGLE" | "MCQ_MULTI" | "SHORT_ANSWER"
  ) => {
    setAnswers((prev) => {
      const current = prev[qId] || {
        questionId: qId,
        selectedOptionIds: [],
        textAnswer: "",
        isFlagged: false,
      };

      let newSelected: string[] = [];
      if (type === "MCQ_SINGLE") {
        newSelected = [optionId];
      } else if (type === "MCQ_MULTI") {
        if (current.selectedOptionIds.includes(optionId)) {
          newSelected = current.selectedOptionIds.filter((id) => id !== optionId);
        } else {
          newSelected = [...current.selectedOptionIds, optionId];
        }
      }

      return {
        ...prev,
        [qId]: { ...current, selectedOptionIds: newSelected },
      };
    });
  };

  const handleTextAnswerChange = (qId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || {
          questionId: qId,
          selectedOptionIds: [],
          textAnswer: "",
          isFlagged: false,
        }),
        textAnswer: text,
      },
    }));
  };

  const toggleFlagCurrent = () => {
    const q = questions[currentIndex];
    if (!q) return;
    setAnswers((prev) => ({
      ...prev,
      [q.id]: {
        ...(prev[q.id] || {
          questionId: q.id,
          selectedOptionIds: [],
          textAnswer: "",
          isFlagged: false,
        }),
        isFlagged: !prev[q.id]?.isFlagged,
      },
    }));
  };

  // Submit Test Function
  const handleSubmitTest = useCallback(async () => {
    if (!attempt?.id || isSubmitting) return;
    setIsSubmitting(true);
    setShowReviewModal(false);

    const answerList = Object.values(answers);

    try {
      const res = await fetch(`/api/student/attempts/${attempt.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerList }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to submit test");
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      setScoredResult(data.result);
      toast.success("Assessment submitted & scored!");
    } catch (err) {
      console.error("Submission error:", err);
      toast.error("Failed to submit test. Please retry.");
      setIsSubmitting(false);
    }
  }, [attempt, answers, isSubmitting]);

  // 2. Autosave periodically (every 12 seconds or on answer change)
  const autosave = useCallback(async () => {
    if (!attempt?.id) return;
    const answerList = Object.values(answers);

    try {
      await fetch(`/api/student/attempts/${attempt.id}/autosave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerList }),
      });
      setLastSavedTime(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.error("Autosave error:", err);
    }
  }, [attempt, answers]);

  useEffect(() => {
    const timer = setInterval(() => {
      autosave();
    }, 12000);
    return () => clearInterval(timer);
  }, [autosave]);

  // 3. Countdown Timer
  useEffect(() => {
    if (timeLeftSec === null || timeLeftSec <= 0) return;

    const timer = setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmitTest(); // Auto-submit when time expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeftSec, handleSubmitTest]);

  // 4. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showReviewModal || isSubmitting || scoredResult) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentIndex > 0) setCurrentIndex((i) => i - 1);
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFlagCurrent();
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        const optIndex = parseInt(e.key) - 1;
        const currentQ = questions[currentIndex];
        if (currentQ && currentQ.options[optIndex]) {
          handleOptionSelect(currentQ.id, currentQ.options[optIndex].id, currentQ.type);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, questions, showReviewModal, isSubmitting, scoredResult]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Preparing assessment...</p>
      </div>
    );
  }

  // Show Results Screen if submitted
  if (scoredResult) {
    return (
      <ResultsScreen
        result={scoredResult}
        testTitle={attempt?.testTitle || "Assessment"}
        sportName={attempt?.sportName || "Sport"}
        onRetake={() => {
          setScoredResult(null);
          setCurrentIndex(0);
          window.location.reload();
        }}
        onExit={onExit}
      />
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion?.id] || {
    questionId: currentQuestion?.id,
    selectedOptionIds: [],
    textAnswer: "",
    isFlagged: false,
  };

  const answeredCount = Object.values(answers).filter(
    (a) => a.selectedOptionIds.length > 0 || a.textAnswer.trim().length > 0
  ).length;

  const flaggedCount = Object.values(answers).filter((a) => a.isFlagged).length;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Test Header */}
      <div className="glass-panel rounded-2xl p-6 mb-6 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
              <span>{attempt?.sportName}</span>
              <span>•</span>
              <span>{attempt?.moduleTitle}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white">
              {attempt?.testTitle}
            </h1>
          </div>

          <div className="flex items-center gap-4 self-stretch md:self-auto justify-between">
            {/* Timer */}
            {timeLeftSec !== null && (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-sm ${
                  timeLeftSec < 60
                    ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                    : "bg-slate-900/80 text-white border-white/10"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatTimer(timeLeftSec)}</span>
              </div>
            )}

            {/* Autosave status indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lastSavedTime}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar & Question Stats */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
            <span>
              Question <strong className="text-white">{currentIndex + 1}</strong> of{" "}
              {questions.length}
            </span>
            <span>
              {answeredCount} of {questions.length} Answered
              {flaggedCount > 0 && ` (${flaggedCount} Flagged)`}
            </span>
          </div>
          <LinearProgress
            progress={((currentIndex + 1) / questions.length) * 100}
            color="#3b82f6"
            height={6}
          />
        </div>
      </div>

      {/* Main Question Card with Framer Motion slide */}
      <div className="glass-panel rounded-2xl p-6 md:p-8 mb-6 shadow-2xl relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Question Header & Flag button */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold uppercase tracking-wider">
                  {currentQuestion.type === "MCQ_SINGLE"
                    ? "Single Choice"
                    : currentQuestion.type === "MCQ_MULTI"
                    ? "Multiple Choice"
                    : "Short Answer"}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {currentQuestion.marks} Mark{currentQuestion.marks > 1 ? "s" : ""}
                </span>
              </div>

              <button
                onClick={toggleFlagCurrent}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  currentAnswer.isFlagged
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
                title="Shortcut: 'F' key"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{currentAnswer.isFlagged ? "Flagged" : "Flag"}</span>
              </button>
            </div>

            {/* Prompt */}
            <h2 className="text-lg md:text-xl font-bold text-white mb-6 leading-relaxed">
              {currentQuestion.prompt}
            </h2>

            {/* Optional Image */}
            {currentQuestion.imageUrl && (
              <div className="mb-6 rounded-xl overflow-hidden border border-white/10 max-h-64">
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question Diagram"
                  className="w-full h-full object-contain bg-slate-950"
                />
              </div>
            )}

            {/* Options or Short Answer Input */}
            {currentQuestion.type === "SHORT_ANSWER" ? (
              <div className="mt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Your Answer:
                </label>
                <input
                  type="text"
                  value={currentAnswer.textAnswer}
                  onChange={(e) =>
                    handleTextAnswerChange(currentQuestion.id, e.target.value)
                  }
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-base font-medium"
                />
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = currentAnswer.selectedOptionIds.includes(opt.id);

                  return (
                    <button
                      key={opt.id}
                      onClick={() =>
                        handleOptionSelect(
                          currentQuestion.id,
                          opt.id,
                          currentQuestion.type
                        )
                      }
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${
                        isSelected
                          ? "bg-blue-600/20 border-blue-500 text-white shadow-lg"
                          : "bg-slate-900/40 border-white/5 text-slate-300 hover:bg-white/5 hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                            isSelected
                              ? "bg-blue-500 text-white"
                              : "bg-white/5 text-slate-400 group-hover:bg-white/10"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-sm md:text-base font-medium">
                          {opt.text}
                        </span>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-sm font-semibold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowReviewModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-slate-200 text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            Review & Flagged
          </button>

          {currentIndex === questions.length - 1 ? (
            <button
              onClick={() => setShowReviewModal(true)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-bold hover:brightness-110 shadow-lg shadow-green-900/30 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Submit Test</span>
            </button>
          ) : (
            <button
              onClick={() =>
                setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
              }
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-lg shadow-blue-900/30 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Question Quick-Jump Grid */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
          Jump to Question:
        </div>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, idx) => {
            const ans = answers[q.id];
            const isAnswered =
              (ans?.selectedOptionIds.length ?? 0) > 0 ||
              (ans?.textAnswer.trim().length ?? 0) > 0;
            const isFlagged = ans?.isFlagged;
            const isCurrent = idx === currentIndex;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center ${
                  isCurrent
                    ? "ring-2 ring-blue-400 bg-blue-600 text-white font-extrabold shadow-lg"
                    : isAnswered
                    ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                <span>{idx + 1}</span>
                {isFlagged && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Review & Submit Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-white/10 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-white mb-2">
              Ready to Submit Assessment?
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Review your progress before final server-side scoring:
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
                <p className="text-xs text-slate-400">Answered</p>
                <p className="text-2xl font-black text-emerald-400">
                  {answeredCount} / {questions.length}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
                <p className="text-xs text-slate-400">Flagged for Review</p>
                <p className="text-2xl font-black text-amber-400">{flaggedCount}</p>
              </div>
            </div>

            {answeredCount < questions.length && (
              <div className="p-3 mb-6 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  You have {questions.length - answeredCount} unanswered questions.
                  Unanswered questions will receive 0 marks.
                </span>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
              >
                Back to Questions
              </button>
              <button
                onClick={handleSubmitTest}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-bold hover:brightness-110 shadow-lg shadow-green-900/30"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Confirm & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
