import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().toLowerCase(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain a digit"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Sport ────────────────────────────────────────────────────────

export const createSportSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  coverImageUrl: z.string().url().optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#6366f1"),
  sequentialUnlock: z.boolean().default(false),
  isPublished: z.boolean().default(false),
});

export const updateSportSchema = createSportSchema.partial();

// ─── Module ───────────────────────────────────────────────────────

export const createModuleSchema = z.object({
  sportId: z.string().cuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  order: z.number().int().min(1),
  requireVideoWatch: z.boolean().default(true),
  requireTestPass: z.boolean().default(true),
  isPublished: z.boolean().default(false),
});

export const updateModuleSchema = createModuleSchema.partial().omit({ sportId: true });

export const reorderModulesSchema = z.object({
  sportId: z.string().cuid(),
  moduleIds: z.array(z.string().cuid()).min(1),
});

// ─── Video ────────────────────────────────────────────────────────

export const createVideoSchema = z.object({
  moduleId: z.string().cuid(),
  provider: z.enum(["LOCAL", "S3", "YOUTUBE", "VIMEO"]),
  storageKey: z.string().optional(),
  externalUrl: z.string().url().optional(),
  durationSec: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
});

export const getUploadUrlSchema = z.object({
  moduleId: z.string().cuid(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().positive(),
});

// ─── Test ─────────────────────────────────────────────────────────

export const createTestSchema = z.object({
  moduleId: z.string().cuid(),
  title: z.string().min(1).max(200),
  passPercent: z.number().min(0).max(100).default(70),
  timeLimitSec: z.number().int().positive().nullable().optional(),
  maxAttempts: z.number().int().positive().nullable().optional(),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  revealAnswers: z.boolean().default(true),
});

export const updateTestSchema = createTestSchema.partial().omit({ moduleId: true });

// ─── Questions ────────────────────────────────────────────────────

export const mcqOptionSchema = z.object({
  text: z.string().min(1).max(1000),
  isCorrect: z.boolean(),
  order: z.number().int().min(0),
});

export const acceptedAnswerSchema = z.object({
  text: z.string().min(1).max(500),
  caseInsensitive: z.boolean().default(true),
  trimWhitespace: z.boolean().default(true),
  fuzzyMatch: z.boolean().default(false),
  levenshteinThreshold: z.number().int().min(0).max(10).default(2),
});

export const createQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("MCQ_SINGLE"),
    testId: z.string().cuid(),
    prompt: z.string().min(1).max(5000),
    imageUrl: z.string().url().nullable().optional(),
    marks: z.number().positive().default(1),
    explanation: z.string().max(2000).optional(),
    order: z.number().int().min(1),
    options: z
      .array(mcqOptionSchema)
      .min(2)
      .max(10)
      .refine((opts) => opts.filter((o) => o.isCorrect).length === 1, {
        message: "MCQ_SINGLE must have exactly one correct option",
      }),
  }),
  z.object({
    type: z.literal("MCQ_MULTI"),
    testId: z.string().cuid(),
    prompt: z.string().min(1).max(5000),
    imageUrl: z.string().url().nullable().optional(),
    marks: z.number().positive().default(1),
    explanation: z.string().max(2000).optional(),
    order: z.number().int().min(1),
    options: z
      .array(mcqOptionSchema)
      .min(2)
      .max(10)
      .refine((opts) => opts.filter((o) => o.isCorrect).length >= 1, {
        message: "MCQ_MULTI must have at least one correct option",
      }),
  }),
  z.object({
    type: z.literal("SHORT_ANSWER"),
    testId: z.string().cuid(),
    prompt: z.string().min(1).max(5000),
    imageUrl: z.string().url().nullable().optional(),
    marks: z.number().positive().default(1),
    explanation: z.string().max(2000).optional(),
    order: z.number().int().min(1),
    acceptedAnswers: z.array(acceptedAnswerSchema).min(1),
  }),
]);

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

// ─── Attempt / Test Submission ────────────────────────────────────

export const submittedAnswerSchema = z.object({
  questionId: z.string().cuid(),
  selectedOptionIds: z.array(z.string().cuid()).optional().default([]),
  textAnswer: z.string().max(2000).optional(),
  isFlagged: z.boolean().optional().default(false),
});

export const autosaveAnswersSchema = z.object({
  attemptId: z.string().cuid(),
  answers: z.array(submittedAnswerSchema),
});

export const submitAttemptSchema = z.object({
  attemptId: z.string().cuid(),
  answers: z.array(submittedAnswerSchema),
});

// ─── Watch Progress ───────────────────────────────────────────────

export const updateWatchProgressSchema = z.object({
  moduleId: z.string().cuid(),
  watchedSec: z.number().min(0),
  watchPercent: z.number().min(0).max(1),
});

// ─── Enrollment ───────────────────────────────────────────────────

export const enrollSchema = z.object({
  userId: z.string().cuid(),
  sportId: z.string().cuid(),
});

// ─── Bulk Question Import ─────────────────────────────────────────

export const bulkQuestionRowSchema = z.object({
  type: z.enum(["MCQ_SINGLE", "MCQ_MULTI", "SHORT_ANSWER"]),
  prompt: z.string().min(1),
  marks: z.coerce.number().positive().default(1),
  explanation: z.string().optional(),
  option_a: z.string().optional(),
  option_b: z.string().optional(),
  option_c: z.string().optional(),
  option_d: z.string().optional(),
  correct_options: z.string().optional(), // "a,b" or "a" for single
  accepted_answers: z.string().optional(), // comma-separated for short answer
  fuzzy_match: z
    .string()
    .transform((v) => v === "true" || v === "1")
    .optional(),
  levenshtein_threshold: z.coerce.number().int().min(0).max(10).optional(),
});

export type BulkQuestionRow = z.infer<typeof bulkQuestionRowSchema>;

// ─── Admin Student Management ─────────────────────────────────────

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["STUDENT", "ADMIN"]).optional(),
});
