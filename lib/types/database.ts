// Hand-authored types mirroring db/migrations/0001_init.sql.
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
  user_id: string;
  title: string;
  body: string;
  tags: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
};

type PromptRefinementsRow = {
  id: string;
  user_id: string;
  original_prompt_id: string | null;
  raw_input: string;
  refined_output: string;
  created_at: string;
};

type RoomsRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  youtube_url: string | null;
  avatar_url: string | null;
  deadline: string | null;
  is_public: boolean;
  created_at: string;
};

type RoomMembersRow = { room_id: string; user_id: string; joined_at: string };

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
        Partial<PromptsRow> & { user_id: string; title: string; body: string },
        Partial<PromptsRow>
      >;
      prompt_refinements: Table<
        PromptRefinementsRow,
        Partial<PromptRefinementsRow> & {
          user_id: string;
          raw_input: string;
          refined_output: string;
        },
        Partial<PromptRefinementsRow>
      >;
      rooms: Table<
        RoomsRow,
        Partial<RoomsRow> & { owner_id: string; name: string; slug: string },
        Partial<RoomsRow>
      >;
      room_members: Table<
        RoomMembersRow,
        { room_id: string; user_id: string },
        Partial<RoomMembersRow>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
