import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CompanionTab = "chat" | "review";

export interface PlanBlockData {
  time: string;
  title: string;
  minutes: number;
  note: string;
  startable: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Structured results from a quick action, rendered instead of plain text when present. */
  plan?: { blocks: PlanBlockData[]; message?: string };
  breakdown?: { steps: string[] };
  sources?: string[];
}

export interface ContextChip {
  label: string;
  text: string;
}

interface CompanionState {
  activeTab: CompanionTab;
  chips: ContextChip[];
  messages: ChatMessage[];
  goTab: (tab: CompanionTab) => void;
  addChip: (chip: ContextChip) => void;
  removeChip: (index: number) => void;
  clearChips: () => void;
  addMessage: (msg: ChatMessage) => void;
}

export const useCompanionStore = create<CompanionState>()(
  persist(
    (set, get) => ({
      activeTab: "chat",
      chips: [],
      messages: [
        {
          role: "assistant",
          content:
            "Morning. I only know what you attach or tell me here — drag a window onto me, @-mention, or just ask.",
        },
      ],
      goTab: (tab) => set({ activeTab: tab }),
      addChip: (chip) => set({ chips: [...get().chips, chip] }),
      removeChip: (index) => set({ chips: get().chips.filter((_, i) => i !== index) }),
      clearChips: () => set({ chips: [] }),
      addMessage: (msg) => set({ messages: [...get().messages, msg].slice(-40) }),
    }),
    {
      name: "lockin-companion",
      // A persisted activeTab from before the tab consolidation (e.g. "unstick")
      // is no longer a valid CompanionTab — it wouldn't crash, but Companion.tsx's
      // {activeTab === "chat" && ...} checks would all fail and render nothing.
      merge: (persisted, current) => {
        const p = persisted as Partial<CompanionState> | undefined;
        const activeTab: CompanionTab = p?.activeTab === "review" ? "review" : "chat";
        return { ...current, ...p, activeTab };
      },
    }
  )
);
