import type { Database } from "@/lib/types/database";

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type FreedomGoal = Database["public"]["Tables"]["freedom_goals"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Note = Database["public"]["Tables"]["notes"]["Row"];
export type ClipboardItem = Database["public"]["Tables"]["clipboard_items"]["Row"];
export type Prompt = Database["public"]["Tables"]["prompts"]["Row"];
export type PromptRefinement =
  Database["public"]["Tables"]["prompt_refinements"]["Row"];

export type {
  SessionMode,
  SessionStatus,
  TaskStatus,
  ClipboardSource,
  PomodoroSettings,
  RoomSettings,
} from "@/lib/types/database";
