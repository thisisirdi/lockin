// Hand-authored types mirroring db/migrations/0001_init.sql and 0002_studio.sql.
// If you later generate types via `supabase gen types typescript`, replace
// this file with the generated one — the shape is intentionally compatible.

export type SessionMode = "countdown" | "stopwatch" | "pomodoro";
export type SessionStatus = "completed" | "cancelled";
export type TaskStatus = "todo" | "done";
export type ClipboardSource = "note" | "prompt" | "task" | "manual";

export interface PomodoroSettings {
  work_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  cycles_before_long_break: number;
}

export interface RoomSettings {
  theme: string;
  youtube_url: string | null;
  volume: number;
}

// ---------------------------------------------------------------------------
// Studio (0002)
// ---------------------------------------------------------------------------

export type BlockType =
  | "role"
  | "context"
  | "task"
  | "constraints"
  | "format"
  | "examples"
  | "guardrails";

export type BlockState = "empty" | "draft" | "locked";

export interface PromptBlock {
  id: string;
  block_type: BlockType;
  framework_slot: string | null;
  body: string;
  state: BlockState;
  order: number;
}

export interface PromptVariable {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean";
  required: boolean;
  options?: string[];
  default?: string;
}

export interface FrameworkSlot {
  slot: string;
  label: string;
  block_type: BlockType;
  required: boolean;
}

export type ContextBlockKind =
  | "company"
  | "product"
  | "customer"
  | "stack"
  | "audience"
  | "voice"
  | "glossary"
  | "snippet";

export type DeliverableType =
  | "discovery"
  | "runbook"
  | "troubleshooting"
  | "onboarding"
  | "qbr"
  | "enablement"
  | "comms"
  | "analysis"
  | "other";

// supabase-js's generic query builder expects each table to carry a
// `Relationships` array (used for embedded-resource typing, which we don't
// use here) — omitting it silently collapses Row/Insert/Update to `never`.
type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ProfilesRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  pomodoro_settings: PomodoroSettings;
  room_settings: RoomSettings;
  min_session_minutes_for_streak: number;
  created_at: string;
};

type CategoriesRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_default: boolean;
  created_at: string;
};

type ProjectsRow = {
  id: string;
  user_id: string;
  name: string;
  url: string | null;
  freedom_goal_id: string | null;
  created_at: string;
};

type FreedomGoalsRow = {
  id: string;
  user_id: string;
  monthly_revenue_goal: number;
  currency: string;
  created_at: string;
};

type ProjectCategoriesRow = { project_id: string; category_id: string };

type SessionsRow = {
  id: string;
  user_id: string;
  category_id: string | null;
  project_id: string | null;
  task_id: string | null;
  mode: SessionMode;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  status: SessionStatus;
  created_at: string;
};

type TasksRow = {
  id: string;
  user_id: string;
  title: string;
  type: string;
  status: TaskStatus;
  completed_at: string | null;
  session_id: string | null;
  created_at: string;
};

type NotesRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  tags: string[];
  project_id: string | null;
  created_at: string;
  updated_at: string;
};

type ClipboardItemsRow = {
  id: string;
  user_id: string;
  content: string;
  source: ClipboardSource;
  created_at: string;
};

type PromptsRow = {
  id: string;
  user_id: string | null;
  title: string;
  body: string;
  tags: string[];
  usage_count: number;
  deliverable_type: DeliverableType | null;
  framework_id: string | null;
  current_version_id: string | null;
  description: string | null;
  is_starter: boolean;
  forked_from_id: string | null;
  public_slug: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type PromptRefinementsLegacyRow = {
  id: string;
  user_id: string;
  original_prompt_id: string | null;
  raw_input: string;
  refined_output: string;
  created_at: string;
};

type FrameworksRow = {
  id: string;
  key: string;
  name: string;
  acronym_expansion: string;
  slot_map: FrameworkSlot[];
  source_url: string | null;
  is_active: boolean;
  created_at: string;
};

type PromptVersionsRow = {
  id: string;
  prompt_id: string;
  version_no: number;
  blocks: PromptBlock[];
  variables: PromptVariable[];
  change_note: string | null;
  created_from_run_id: string | null;
  created_at: string;
};

type ContextBlocksRow = {
  id: string;
  user_id: string;
  kind: ContextBlockKind;
  name: string;
  body: string;
  token_estimate: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type PromptVersionContextsRow = {
  prompt_version_id: string;
  context_block_id: string;
  position: number;
};

type PromptRunsRow = {
  id: string;
  user_id: string;
  prompt_version_id: string;
  provider: string;
  model: string | null;
  variable_values: Record<string, string>;
  resolved_prompt: string;
  output: string | null;
  rating: number | null;
  critique_tags: string[];
  latency_ms: number | null;
  created_at: string;
};

type CritiqueMappingsRow = {
  tag: string;
  label: string;
  target_block_type: BlockType;
  patch_instruction: string;
  static_hint: string | null;
};

type PromptBlockRefinementsRow = {
  id: string;
  user_id: string;
  prompt_id: string | null;
  block_type: BlockType;
  before: string;
  after: string;
  accepted: boolean;
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        ProfilesRow,
        Partial<ProfilesRow> & { user_id: string },
        Partial<ProfilesRow>
      >;
      categories: Table<
        CategoriesRow,
        Partial<CategoriesRow> & { user_id: string; name: string },
        Partial<CategoriesRow>
      >;
      projects: Table<
        ProjectsRow,
        Partial<ProjectsRow> & { user_id: string; name: string },
        Partial<ProjectsRow>
      >;
      freedom_goals: Table<
        FreedomGoalsRow,
        Partial<FreedomGoalsRow> & {
          user_id: string;
          monthly_revenue_goal: number;
        },
        Partial<FreedomGoalsRow>
      >;
      project_categories: Table<
        ProjectCategoriesRow,
        ProjectCategoriesRow,
        Partial<ProjectCategoriesRow>
      >;
      sessions: Table<
        SessionsRow,
        Partial<SessionsRow> & {
          user_id: string;
          mode: SessionMode;
          started_at: string;
          ended_at: string;
          duration_seconds: number;
          status: SessionStatus;
        },
        Partial<SessionsRow>
      >;
      tasks: Table<
        TasksRow,
        Partial<TasksRow> & { user_id: string; title: string },
        Partial<TasksRow>
      >;
      notes: Table<
        NotesRow,
        Partial<NotesRow> & { user_id: string; title: string },
        Partial<NotesRow>
      >;
      clipboard_items: Table<
        ClipboardItemsRow,
        Partial<ClipboardItemsRow> & {
          user_id: string;
          content: string;
          source: ClipboardSource;
        },
        Partial<ClipboardItemsRow>
      >;
      prompts: Table<
        PromptsRow,
        Partial<PromptsRow> & { title: string; body: string },
        Partial<PromptsRow>
      >;
      prompt_refinements_legacy: Table<
        PromptRefinementsLegacyRow,
        Partial<PromptRefinementsLegacyRow> & {
          user_id: string;
          raw_input: string;
          refined_output: string;
        },
        Partial<PromptRefinementsLegacyRow>
      >;
      frameworks: Table<
        FrameworksRow,
        Partial<FrameworksRow> & { key: string; name: string; acronym_expansion: string; slot_map: FrameworkSlot[] },
        Partial<FrameworksRow>
      >;
      prompt_versions: Table<
        PromptVersionsRow,
        Partial<PromptVersionsRow> & { prompt_id: string; version_no: number },
        Partial<PromptVersionsRow>
      >;
      context_blocks: Table<
        ContextBlocksRow,
        Partial<ContextBlocksRow> & { user_id: string; kind: ContextBlockKind; name: string },
        Partial<ContextBlocksRow>
      >;
      prompt_version_contexts: Table<
        PromptVersionContextsRow,
        PromptVersionContextsRow,
        Partial<PromptVersionContextsRow>
      >;
      prompt_runs: Table<
        PromptRunsRow,
        Partial<PromptRunsRow> & { user_id: string; prompt_version_id: string; resolved_prompt: string },
        Partial<PromptRunsRow>
      >;
      critique_mappings: Table<
        CritiqueMappingsRow,
        CritiqueMappingsRow,
        Partial<CritiqueMappingsRow>
      >;
      prompt_block_refinements: Table<
        PromptBlockRefinementsRow,
        Partial<PromptBlockRefinementsRow> & {
          user_id: string;
          block_type: BlockType;
          before: string;
          after: string;
        },
        Partial<PromptBlockRefinementsRow>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
