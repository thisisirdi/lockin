import type { PromptBlock, BlockType } from "@/lib/types";

export interface BlockDiffEntry {
  blockType: BlockType;
  before: string | null;
  after: string | null;
  changed: boolean;
}

/** Block-level diff between two versions' blocks — one entry per block type present in either. */
export function diffBlocks(before: PromptBlock[], after: PromptBlock[]): BlockDiffEntry[] {
  const beforeByType = new Map(before.map((b) => [b.block_type, b]));
  const afterByType = new Map(after.map((b) => [b.block_type, b]));
  const types = new Set<BlockType>([...beforeByType.keys(), ...afterByType.keys()]);

  const orderOf = (t: BlockType) => afterByType.get(t)?.order ?? beforeByType.get(t)?.order ?? 0;

  return [...types]
    .sort((a, b) => orderOf(a) - orderOf(b))
    .map((blockType) => {
      const beforeBody = beforeByType.get(blockType)?.body ?? null;
      const afterBody = afterByType.get(blockType)?.body ?? null;
      return { blockType, before: beforeBody, after: afterBody, changed: beforeBody !== afterBody };
    });
}

/** Applies a single-block patch on top of a version's blocks, leaving every other block byte-identical. */
export function patchBlock(blocks: PromptBlock[], blockType: BlockType, newBody: string): PromptBlock[] {
  return blocks.map((b) => (b.block_type === blockType ? { ...b, body: newBody, state: "locked" as const } : b));
}
