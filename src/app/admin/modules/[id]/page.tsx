"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Video,
  FileText,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Download,
  AlertCircle,
  HelpCircle,
  Settings,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface AcceptedAnswer {
  id: string;
  text: string;
  caseInsensitive: boolean;
  trimWhitespace: boolean;
  fuzzyMatch: boolean;
  levenshteinThreshold: number;
}

interface Question {
  id: string;
  type: "MCQ_SINGLE" | "MCQ_MULTI" | "SHORT_ANSWER";
  prompt: string;
  imageUrl: string | null;
  marks: number;
  explanation: string | null;
  order: number;
  options: Option[];
  acceptedAnswers: AcceptedAnswer[];
}

interface ModuleDetail {
  id: string;
  sportId: string;
  title: string;
  description: string | null;
  order: number;
  requireVideoWatch: boolean;
  requireTestPass: boolean;
  sport: { id: string; name: string; slug: string };
  video: {
    id: string;
    provider: string;
    storageKey: string | null;
    externalUrl: string | null;
    durationSec: number | null;
  } | null;
  test: {
    id: string;
    title: string;
    passPercent: number;
    timeLimitSec: number | null;
    maxAttempts: number | null;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    revealAnswers: boolean;
    questions: Question[];
  } | null;
}

export default function AdminModuleContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  // Video state
  const [videoProvider, setVideoProvider] = useState<"YOUTUBE" | "S3">("YOUTUBE");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDuration, setVideoDuration] = useState(600);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Question Modal state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionType, setQuestionType] = useState<"MCQ_SINGLE" | "MCQ_MULTI" | "SHORT_ANSWER">("MCQ_SINGLE");
  const [prompt, setPrompt] = useState("");
  const [marks, setMarks] = useState(2);
  const [explanation, setExplanation] = useState("");
  const [options, setOptions] = useState([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [acceptedAnswersText, setAcceptedAnswersText] = useState("");
  const [fuzzyMatch, setFuzzyMatch] = useState(true);
  const [fuzzyThreshold, setFuzzyThreshold] = useState(1);

  // Bulk Import state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-module", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/modules/${id}`);
      if (!res.ok) throw new Error("Failed to load module");
      return res.json() as Promise<{ module: ModuleDetail }>;
    },
  });

  // Save Video Mutation
  const saveVideoMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save video");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Video linked to module!");
      queryClient.invalidateQueries({ queryKey: ["admin-module", id] });
    },
    onError: () => toast.error("Failed to link video"),
  });

  // Create Test Mutation
  const createTestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: id,
          title: `${data?.module.title} — Assessment`,
          passPercent: 70,
          timeLimitSec: 600,
          maxAttempts: 3,
          shuffleQuestions: true,
          shuffleOptions: true,
          revealAnswers: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to create test");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Assessment created for this module!");
      queryClient.invalidateQueries({ queryKey: ["admin-module", id] });
    },
  });

  // Update Test Settings Mutation
  const updateTestMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!data?.module.test?.id) return;
      const res = await fetch(`/api/admin/tests/${data.module.test.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update test settings");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Assessment settings saved");
      queryClient.invalidateQueries({ queryKey: ["admin-module", id] });
    },
  });

  // Create Question Mutation
  const createQuestionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create question");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Question added!");
      setShowQuestionModal(false);
      setPrompt("");
      setExplanation("");
      queryClient.invalidateQueries({ queryKey: ["admin-module", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add question");
    },
  });

  // Delete Question Mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (qId: string) => {
      const res = await fetch(`/api/admin/questions/${qId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete question");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Question deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-module", id] });
    },
  });

  // Bulk Import Mutation
  const bulkImportMutation = useMutation({
    mutationFn: async () => {
      if (!csvFile || !data?.module.test?.id) return;
      const formData = new FormData();
      formData.append("testId", data.module.test.id);
      formData.append("file", csvFile);

      const res = await fetch("/api/admin/questions/bulk-import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Bulk import failed");
      }
      return res.json();
    },
    onSuccess: (res) => {
      toast.success(`Successfully imported ${res.importedCount} questions!`);
      if (res.errors?.length > 0) {
        toast.warning(`${res.errors.length} rows had warnings.`);
      }
      setShowBulkModal(false);
      setCsvFile(null);
      queryClient.invalidateQueries({ queryKey: ["admin-module", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Import error");
    },
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center text-slate-400">Loading module editor...</div>;
  }

  const { module } = data;

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!module.test?.id) return;

    const nextOrder = (module.test.questions?.length || 0) + 1;

    if (questionType === "SHORT_ANSWER") {
      const answersList = acceptedAnswersText
        .split("|")
        .map((a) => a.trim())
        .filter(Boolean);

      if (answersList.length === 0) {
        toast.error("Please provide at least one accepted short answer (e.g. 'boxing')");
        return;
      }

      createQuestionMutation.mutate({
        testId: module.test.id,
        type: "SHORT_ANSWER",
        prompt,
        marks,
        explanation,
        order: nextOrder,
        acceptedAnswers: answersList.map((text) => ({
          text,
          caseInsensitive: true,
          trimWhitespace: true,
          fuzzyMatch,
          levenshteinThreshold: fuzzyThreshold,
        })),
      });
    } else {
      const validOptions = options.filter((o) => o.text.trim().length > 0);
      if (validOptions.length < 2) {
        toast.error("Please provide at least 2 options for MCQ");
        return;
      }

      const hasCorrect = validOptions.some((o) => o.isCorrect);
      if (!hasCorrect) {
        toast.error("Please mark at least one option as correct");
        return;
      }

      createQuestionMutation.mutate({
        testId: module.test.id,
        type: questionType,
        prompt,
        marks,
        explanation,
        order: nextOrder,
        options: validOptions.map((opt, i) => ({
          text: opt.text,
          isCorrect: opt.isCorrect,
          order: i + 1,
        })),
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back button */}
      <div>
        <Link
          href={`/admin/sports/${module.sportId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {module.sport.name} Modules</span>
        </Link>
      </div>

      {/* Header */}
      <div className="glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
          <span>{module.sport.name}</span>
          <span>•</span>
          <span>Module {module.order}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white">
          {module.title}
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          {module.description || "Video drill lessons and verified test scoring."}
        </p>
      </div>

      {/* Video Content Manager */}
      <section className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Video className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-black text-white">Training Video Source</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              External Video URL (YouTube / Vimeo / Direct MP4)
            </label>
            <input
              type="text"
              value={videoUrl || module.video?.externalUrl || ""}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Video Duration (Seconds)
            </label>
            <input
              type="number"
              value={videoDuration}
              onChange={(e) => setVideoDuration(Number(e.target.value))}
              placeholder="600"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-slate-400">
            {module.video
              ? `Current Source: ${module.video.provider} (${module.video.externalUrl || module.video.storageKey})`
              : "No video linked yet."}
          </span>

          <button
            onClick={() =>
              saveVideoMutation.mutate({
                moduleId: id,
                provider: "YOUTUBE",
                externalUrl: videoUrl || module.video?.externalUrl,
                durationSec: videoDuration,
              })
            }
            disabled={saveVideoMutation.isPending}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
          >
            {saveVideoMutation.isPending ? "Saving..." : "Save Video Source"}
          </button>
        </div>
      </section>

      {/* Assessment Test Manager */}
      <section className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-black text-white">Module Assessment</h2>
          </div>

          {!module.test ? (
            <button
              onClick={() => createTestMutation.mutate()}
              disabled={createTestMutation.isPending}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
            >
              Create Assessment Test
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Bulk Import Questions</span>
              </button>

              <button
                onClick={() => setShowQuestionModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-950/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>
          )}
        </div>

        {/* Test Settings Form if test exists */}
        {module.test && (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Assessment Settings & Security Rules
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] text-slate-400 uppercase font-semibold mb-1">
                  Pass Percentage (%)
                </label>
                <input
                  type="number"
                  defaultValue={module.test.passPercent}
                  onBlur={(e) =>
                    updateTestMutation.mutate({ passPercent: Number(e.target.value) })
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 uppercase font-semibold mb-1">
                  Time Limit (Seconds, blank=none)
                </label>
                <input
                  type="number"
                  defaultValue={module.test.timeLimitSec || ""}
                  onBlur={(e) =>
                    updateTestMutation.mutate({
                      timeLimitSec: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="e.g. 600"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 uppercase font-semibold mb-1">
                  Max Attempts (blank=unlimited)
                </label>
                <input
                  type="number"
                  defaultValue={module.test.maxAttempts || ""}
                  onBlur={(e) =>
                    updateTestMutation.mutate({
                      maxAttempts: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="e.g. 3"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs"
                />
              </div>
            </div>

            {/* Checkbox Toggles */}
            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={module.test.shuffleQuestions}
                  onChange={(e) =>
                    updateTestMutation.mutate({ shuffleQuestions: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-amber-500 bg-slate-800"
                />
                <span>Shuffle Questions</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={module.test.shuffleOptions}
                  onChange={(e) =>
                    updateTestMutation.mutate({ shuffleOptions: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-amber-500 bg-slate-800"
                />
                <span>Shuffle Options</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={module.test.revealAnswers}
                  onChange={(e) =>
                    updateTestMutation.mutate({ revealAnswers: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-amber-500 bg-slate-800"
                />
                <span>Reveal Answers & Explanations After Submit</span>
              </label>
            </div>
          </div>
        )}

        {/* Questions List */}
        {module.test && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">
              Questions ({module.test.questions?.length || 0})
            </h3>

            {module.test.questions?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No questions added yet. Click "Add Question" or "Bulk Import Questions" above.
              </p>
            ) : (
              module.test.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-start justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        Q{idx + 1}.
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 text-[10px] uppercase font-bold">
                        {q.type}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {q.marks} Mark{q.marks > 1 ? "s" : ""}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-white">{q.prompt}</p>

                    {/* Options or Accepted Answers preview */}
                    {q.type === "SHORT_ANSWER" ? (
                      <div className="text-xs text-slate-400">
                        Accepted Answers:{" "}
                        <strong className="text-emerald-400">
                          {q.acceptedAnswers.map((a) => a.text).join(", ")}
                        </strong>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {q.options.map((opt) => (
                          <span
                            key={opt.id}
                            className={`px-2 py-1 rounded-md ${
                              opt.isCorrect
                                ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                                : "bg-white/5 text-slate-400"
                            }`}
                          >
                            {opt.isCorrect && "✓ "}
                            {opt.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (confirm("Delete this question?")) {
                        deleteQuestionMutation.mutate(q.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Add Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel w-full max-w-xl rounded-2xl p-6 shadow-2xl border border-white/10 my-8">
            <h3 className="text-xl font-black text-white mb-2">Add Question</h3>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Question Type
                </label>
                <select
                  value={questionType}
                  onChange={(e: any) => setQuestionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                >
                  <option value="MCQ_SINGLE">MCQ — Single Correct Option</option>
                  <option value="MCQ_MULTI">MCQ — Multiple Correct Options</option>
                  <option value="SHORT_ANSWER">Short Answer (One Line)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Question Prompt
                </label>
                <textarea
                  rows={2}
                  required
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter the question text..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Marks Awarded
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={marks}
                    onChange={(e) => setMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Explanation (revealed after submit)
                  </label>
                  <input
                    type="text"
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Why this answer is correct..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>

              {/* Options for MCQ */}
              {questionType !== "SHORT_ANSWER" ? (
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-semibold uppercase text-slate-400">
                    Options (Check the correct answer{questionType === "MCQ_MULTI" ? "s" : ""})
                  </label>
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type={questionType === "MCQ_SINGLE" ? "radio" : "checkbox"}
                        name="correctOpt"
                        checked={opt.isCorrect}
                        onChange={(e) => {
                          const updated = options.map((o, i) => {
                            if (questionType === "MCQ_SINGLE") {
                              return { ...o, isCorrect: i === idx };
                            } else {
                              return i === idx ? { ...o, isCorrect: e.target.checked } : o;
                            }
                          });
                          setOptions(updated);
                        }}
                        className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-white/10"
                      />
                      <input
                        type="text"
                        placeholder={`Option ${idx + 1}`}
                        value={opt.text}
                        onChange={(e) => {
                          const updated = [...options];
                          updated[idx].text = e.target.value;
                          setOptions(updated);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Accepted Answers (Pipe separated, e.g. "boxing|box")
                    </label>
                    <input
                      type="text"
                      required
                      value={acceptedAnswersText}
                      onChange={(e) => setAcceptedAnswersText(e.target.value)}
                      placeholder="e.g. boxing|box|pugilism"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fuzzyMatch}
                        onChange={(e) => setFuzzyMatch(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 bg-slate-900"
                      />
                      <span>Levenshtein Fuzzy Match</span>
                    </label>

                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">
                        Max Edit Distance Threshold
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        value={fuzzyThreshold}
                        onChange={(e) => setFuzzyThreshold(Number(e.target.value))}
                        className="w-full px-3 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createQuestionMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400"
                >
                  {createQuestionMutation.isPending ? "Saving..." : "Save Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-white/10">
            <h3 className="text-xl font-black text-white mb-2">
              Bulk Import Questions
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Upload a CSV file containing questions, options, and accepted answers.
            </p>

            <div className="mb-4 p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-300">Download formatted CSV template:</span>
              <a
                href="/api/admin/questions/template"
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-xs font-bold border border-blue-500/30 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV Template</span>
              </a>
            </div>

            <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center space-y-2 mb-6">
              <Upload className="w-8 h-8 text-slate-500 mx-auto" />
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
              />
              {csvFile && (
                <p className="text-xs text-emerald-400 font-bold">
                  Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => bulkImportMutation.mutate()}
                disabled={!csvFile || bulkImportMutation.isPending}
                className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 disabled:opacity-50"
              >
                {bulkImportMutation.isPending ? "Importing..." : "Start Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
