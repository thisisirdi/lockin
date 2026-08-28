import type { Database } from "@/lib/types/database";

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type FreedomGoal = Database["public"]["Tables"]["freedom_goals"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Note = Database["public"]["Tables"]["notes"]["Row"];
export type ClipboardItem = Database["public"]["Tables"]["clipboard_items"]["Row"];
export type Prompt = Database["public"]["Tables"]["prompts"]["Row"];
export type PromptRefinementLegacy =
  Database["public"]["Tables"]["prompt_refinements_legacy"]["Row"];
export type Framework = Database["public"]["Tables"]["frameworks"]["Row"];
export type PromptVersion = Database["public"]["Tables"]["prompt_versions"]["Row"];
export type ContextBlock = Database["public"]["Tables"]["context_blocks"]["Row"];
export type PromptVersionContext =
  Database["public"]["Tables"]["prompt_version_contexts"]["Row"];
export type PromptRun = Database["public"]["Tables"]["prompt_runs"]["Row"];
export type CritiqueMapping = Database["public"]["Tables"]["critique_mappings"]["Row"];
export type PromptBlockRefinement =
  Database["public"]["Tables"]["prompt_block_refinements"]["Row"];

export type {
  SessionMode,
  SessionStatus,
  TaskStatus,
  ClipboardSource,
  PomodoroSettings,
  RoomSettings,
  BlockType,
  BlockState,
  PromptBlock,
  PromptVariable,
  FrameworkSlot,
  ContextBlockKind,
  DeliverableType,
} from "@/lib/types/database";
