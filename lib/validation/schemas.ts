import { z } from "zod";

export const TaskCreateSchema = z.object({
  title: z.string().trim().min(1),
  type: z.string().trim().min(1).optional(),
});

export const TaskUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  type: z.string().trim().min(1).optional(),
  status: z.enum(["todo", "done"]).optional(),
});

export const NoteCreateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  body: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const NoteUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  body: z.string().optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export const DeliverableTypeSchema = z.enum([
  "discovery",
  "runbook",
  "troubleshooting",
  "onboarding",
  "qbr",
  "enablement",
  "comms",
  "analysis",
  "other",
]);

export const PromptCreateSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().optional().default(""),
  tags: z.array(z.string()).optional(),
  description: z.string().trim().optional(),
  deliverableType: DeliverableTypeSchema.optional(),
  frameworkId: z.string().uuid().nullable().optional(),
});

export const PromptUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  body: z.string().trim().min(1).optional(),
  tags: z.array(z.string()).optional(),
  incrementUsage: z.boolean().optional(),
});

export const CategoryCreateSchema = z.object({
  name: z.string().trim().min(1),
  color: z.string().trim().min(1).optional(),
});

export const ClipboardCreateSchema = z.object({
  content: z.string().trim().min(1),
  source: z.enum(["note", "prompt", "task", "manual"]),
});

export const FreedomGoalCreateSchema = z.object({
  monthlyRevenueGoal: z.number().positive(),
  currency: z.string().trim().min(1).optional(),
  projectName: z.string().trim().min(1),
  projectUrl: z.string().trim().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
});

export const ProfileUpdateSchema = z.object({
  pomodoroSettings: z
    .object({
      work_minutes: z.number().positive(),
      short_break_minutes: z.number().positive(),
      long_break_minutes: z.number().positive(),
      cycles_before_long_break: z.number().positive(),
    })
    .optional(),
  roomSettings: z
    .object({
      theme: z.string(),
      youtube_url: z.string().nullable(),
      volume: z.number().min(0).max(100),
    })
    .optional(),
  minSessionMinutesForStreak: z.number().positive().optional(),
  displayName: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
});

export const SessionCreateSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
  mode: z.enum(["countdown", "stopwatch", "pomodoro"]),
  startedAt: z.string(),
  endedAt: z.string(),
  durationSeconds: z.number().nonnegative(),
  status: z.enum(["completed", "cancelled"]),
});

export const RefinePromptSchema = z.object({
  rawInput: z.string().trim().min(1),
  originalPromptId: z.string().uuid().nullable().optional(),
});

export const CompanionChatSchema = z.object({
  message: z.string().trim().min(1),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional(),
  context: z.array(z.string()).optional(),
});

export const CompanionAskNotesSchema = z.object({
  question: z.string().trim().min(1),
});

export const CompanionBreakdownSchema = z.object({
  title: z.string().trim().min(1),
});

export const BlockTypeSchema = z.enum([
  "role",
  "context",
  "task",
  "constraints",
  "format",
  "examples",
  "guardrails",
]);

const LockedBlockSchema = z.object({
  blockType: BlockTypeSchema,
  body: z.string(),
});

export const RefineBlockSchema = z.object({
  blockType: BlockTypeSchema,
  draft: z.string().trim().min(1),
  deliverableType: z.string().trim().nullable().optional(),
  lockedBlocks: z.array(LockedBlockSchema).optional().default([]),
});

export const SuggestBlockSchema = z.object({
  blockType: BlockTypeSchema,
  deliverableType: z.string().trim().nullable().optional(),
  lockedBlocks: z.array(LockedBlockSchema).optional().default([]),
});

const PromptBlockSchema = z.object({
  id: z.string(),
  block_type: BlockTypeSchema,
  framework_slot: z.string().nullable(),
  body: z.string(),
  state: z.enum(["empty", "draft", "locked"]),
  order: z.number(),
});

const PromptVariableSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "number", "select", "boolean"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  default: z.string().optional(),
});

export const VersionCreateSchema = z.object({
  blocks: z.array(PromptBlockSchema),
  variables: z.array(PromptVariableSchema).optional(),
  changeNote: z.string().trim().optional(),
  createdFromRunId: z.string().uuid().nullable().optional(),
});
