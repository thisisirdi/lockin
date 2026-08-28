import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyFramework } from "@/lib/studio/frameworks";
import type { BlockType, BlockState, PromptBlock, PromptVariable, Framework, DeliverableType } from "@/lib/types";

export interface StudioContextChip {
  label: string;
  text: string;
}

function nextState(body: string): BlockState {
  return body.trim() ? "draft" : "empty";
}

interface StudioState {
  promptId: string | null;
  title: string;
  deliverableType: DeliverableType | null;
  framework: Framework | null;
  blocks: PromptBlock[];
  variables: PromptVariable[];
  contextChips: StudioContextChip[];

  setTitle: (title: string) => void;
  setDeliverableType: (type: DeliverableType | null) => void;
  setFramework: (framework: Framework) => void;
  updateBlockBody: (blockType: BlockType, body: string) => void;
  lockBlock: (blockType: BlockType, body: string) => void;
  unlockBlock: (blockType: BlockType) => void;
  addContextChip: (chip: StudioContextChip) => void;
  removeContextChip: (index: number) => void;
  loadPrompt: (opts: {
    promptId: string;
    title: string;
    deliverableType: DeliverableType | null;
    framework: Framework | null;
    blocks: PromptBlock[];
    variables: PromptVariable[];
  }) => void;
  reset: () => void;
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      promptId: null,
      title: "",
      deliverableType: null,
      framework: null,
      blocks: [],
      variables: [],
      contextChips: [],

      setTitle: (title) => set({ title }),
      setDeliverableType: (deliverableType) => set({ deliverableType }),

      setFramework: (framework) => {
        set({ framework, blocks: applyFramework(get().blocks, framework) });
      },

      updateBlockBody: (blockType, body) => {
        set({
          blocks: get().blocks.map((b) =>
            b.block_type === blockType && b.state !== "locked"
              ? { ...b, body, state: nextState(body) }
              : b
          ),
        });
      },

      lockBlock: (blockType, body) => {
        set({
          blocks: get().blocks.map((b) =>
            b.block_type === blockType ? { ...b, body, state: "locked" } : b
          ),
        });
      },

      unlockBlock: (blockType) => {
        set({
          blocks: get().blocks.map((b) =>
            b.block_type === blockType ? { ...b, state: nextState(b.body) } : b
          ),
        });
      },

      addContextChip: (chip) => set({ contextChips: [...get().contextChips, chip] }),
      removeContextChip: (index) =>
        set({ contextChips: get().contextChips.filter((_, i) => i !== index) }),

      loadPrompt: ({ promptId, title, deliverableType, framework, blocks, variables }) =>
        set({ promptId, title, deliverableType, framework, blocks, variables, contextChips: [] }),

      reset: () =>
        set({
          promptId: null,
          title: "",
          deliverableType: null,
          framework: null,
          blocks: [],
          variables: [],
          contextChips: [],
        }),
    }),
    { name: "lockin-studio" }
  )
);
