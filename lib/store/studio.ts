import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyFramework } from "@/lib/studio/frameworks";
import { syncVariables } from "@/lib/studio/variables";
import type {
  BlockType,
  BlockState,
  PromptBlock,
  PromptVariable,
  Framework,
  DeliverableType,
  ContextBlock,
} from "@/lib/types";

export interface StudioContextChip {
  label: string;
  text: string;
}

function nextState(body: string): BlockState {
  return body.trim() ? "draft" : "empty";
}

interface StudioState {
  promptId: string | null;
  currentVersionId: string | null;
  title: string;
  deliverableType: DeliverableType | null;
  framework: Framework | null;
  blocks: PromptBlock[];
  variables: PromptVariable[];
  contextChips: StudioContextChip[];
  attachedContextBlocks: ContextBlock[];

  setTitle: (title: string) => void;
  setDeliverableType: (type: DeliverableType | null) => void;
  setFramework: (framework: Framework) => void;
  updateBlockBody: (blockType: BlockType, body: string) => void;
  lockBlock: (blockType: BlockType, body: string) => void;
  unlockBlock: (blockType: BlockType) => void;
  updateVariable: (key: string, patch: Partial<PromptVariable>) => void;
  /** Replaces the whole blocks array, e.g. after accepting a critique-driven patch. Re-syncs variables. */
  setBlocks: (blocks: PromptBlock[]) => void;
  addContextChip: (chip: StudioContextChip) => void;
  removeContextChip: (index: number) => void;
  attachContextBlock: (block: ContextBlock) => void;
  detachContextBlock: (id: string) => void;
  setCurrentVersionId: (id: string | null) => void;
  /** Records a save's result without touching in-progress context (unlike loadPrompt, which is for opening a different prompt entirely). */
  markSaved: (promptId: string, versionId: string) => void;
  /** Switches to a different version's content (promote, or picking an old version) without resetting title/framework/context. */
  switchVersion: (versionId: string, blocks: PromptBlock[], variables: PromptVariable[]) => void;
  loadPrompt: (opts: {
    promptId: string;
    currentVersionId: string | null;
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
      currentVersionId: null,
      title: "",
      deliverableType: null,
      framework: null,
      blocks: [],
      variables: [],
      contextChips: [],
      attachedContextBlocks: [],

      setTitle: (title) => set({ title }),
      setDeliverableType: (deliverableType) => set({ deliverableType }),

      setFramework: (framework) => {
        const blocks = applyFramework(get().blocks, framework);
        set({ framework, blocks, variables: syncVariables(blocks, get().variables) });
      },

      updateBlockBody: (blockType, body) => {
        const blocks = get().blocks.map((b) =>
          b.block_type === blockType && b.state !== "locked" ? { ...b, body, state: nextState(body) } : b
        );
        set({ blocks, variables: syncVariables(blocks, get().variables) });
      },

      lockBlock: (blockType, body) => {
        const blocks = get().blocks.map((b) =>
          b.block_type === blockType ? { ...b, body, state: "locked" as const } : b
        );
        set({ blocks, variables: syncVariables(blocks, get().variables) });
      },

      unlockBlock: (blockType) => {
        set({
          blocks: get().blocks.map((b) =>
            b.block_type === blockType ? { ...b, state: nextState(b.body) } : b
          ),
        });
      },

      updateVariable: (key, patch) => {
        set({
          variables: get().variables.map((v) => (v.key === key ? { ...v, ...patch } : v)),
        });
      },

      setBlocks: (blocks) => set({ blocks, variables: syncVariables(blocks, get().variables) }),

      addContextChip: (chip) => set({ contextChips: [...get().contextChips, chip] }),
      removeContextChip: (index) =>
        set({ contextChips: get().contextChips.filter((_, i) => i !== index) }),

      attachContextBlock: (block) => {
        if (get().attachedContextBlocks.some((b) => b.id === block.id)) return;
        set({ attachedContextBlocks: [...get().attachedContextBlocks, block] });
      },
      detachContextBlock: (id) =>
        set({ attachedContextBlocks: get().attachedContextBlocks.filter((b) => b.id !== id) }),

      setCurrentVersionId: (currentVersionId) => set({ currentVersionId }),
      markSaved: (promptId, versionId) => set({ promptId, currentVersionId: versionId }),
      switchVersion: (versionId, blocks, variables) =>
        set({ currentVersionId: versionId, blocks, variables }),

      loadPrompt: ({ promptId, currentVersionId, title, deliverableType, framework, blocks, variables }) =>
        set({
          promptId,
          currentVersionId,
          title,
          deliverableType,
          framework,
          blocks,
          variables,
          contextChips: [],
          attachedContextBlocks: [],
        }),

      reset: () =>
        set({
          promptId: null,
          currentVersionId: null,
          title: "",
          deliverableType: null,
          framework: null,
          blocks: [],
          variables: [],
          contextChips: [],
          attachedContextBlocks: [],
        }),
    }),
    { name: "lockin-studio" }
  )
);
