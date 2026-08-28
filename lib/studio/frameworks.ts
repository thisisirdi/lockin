import type { Framework, PromptBlock, BlockType } from "@/lib/types";

function emptyBlock(blockType: BlockType, framework_slot: string | null, order: number): PromptBlock {
  return {
    id: crypto.randomUUID(),
    block_type: blockType,
    framework_slot,
    body: "",
    state: "empty",
    order,
  };
}

/**
 * Re-labels and re-orders blocks onto a framework's slots. Never rewrites
 * content: a block whose type already exists keeps its body and state
 * byte-identical, just gets a new `framework_slot` and `order`. Block types
 * with no slot in the target framework move to the end with `framework_slot:
 * null` (the "Additional" group) and stay in the resolved prompt.
 */
export function applyFramework(blocks: PromptBlock[], framework: Framework): PromptBlock[] {
  const byType = new Map<BlockType, PromptBlock>();
  for (const block of blocks) byType.set(block.block_type, block);

  const usedTypes = new Set<BlockType>();
  const mapped = framework.slot_map.map((slot, i) => {
    usedTypes.add(slot.block_type);
    const existing = byType.get(slot.block_type);
    return existing
      ? { ...existing, framework_slot: slot.slot, order: i }
      : emptyBlock(slot.block_type, slot.slot, i);
  });

  const additional = blocks
    .filter((b) => !usedTypes.has(b.block_type))
    .map((b, i) => ({ ...b, framework_slot: null, order: mapped.length + i }));

  return [...mapped, ...additional];
}
