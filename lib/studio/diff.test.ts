import { describe, it, expect } from "vitest";
import { diffBlocks, patchBlock } from "@/lib/studio/diff";
import type { PromptBlock } from "@/lib/types";

function block(overrides: Partial<PromptBlock>): PromptBlock {
  return {
    id: crypto.randomUUID(),
    block_type: "task",
    framework_slot: null,
    body: "",
    state: "locked",
    order: 0,
    ...overrides,
  };
}

describe("diffBlocks", () => {
  it("flags a changed block and leaves an unchanged one alone", () => {
    const before = [block({ block_type: "task", body: "old", order: 0 })];
    const after = [block({ block_type: "task", body: "new", order: 0 })];
    const result = diffBlocks(before, after);
    expect(result).toEqual([{ blockType: "task", before: "old", after: "new", changed: true }]);
  });

  it("reports unchanged as changed: false", () => {
    const before = [block({ block_type: "task", body: "same", order: 0 })];
    const after = [block({ block_type: "task", body: "same", order: 0 })];
    expect(diffBlocks(before, after)[0].changed).toBe(false);
  });

  it("handles a block added in the after version", () => {
    const before = [block({ block_type: "task", body: "x" })];
    const after = [block({ block_type: "task", body: "x" }), block({ block_type: "format", body: "y", order: 1 })];
    const result = diffBlocks(before, after);
    const added = result.find((r) => r.blockType === "format")!;
    expect(added.before).toBeNull();
    expect(added.after).toBe("y");
    expect(added.changed).toBe(true);
  });

  it("handles a block removed in the after version", () => {
    const before = [block({ block_type: "task", body: "x" }), block({ block_type: "format", body: "y", order: 1 })];
    const after = [block({ block_type: "task", body: "x" })];
    const result = diffBlocks(before, after);
    const removed = result.find((r) => r.blockType === "format")!;
    expect(removed.before).toBe("y");
    expect(removed.after).toBeNull();
    expect(removed.changed).toBe(true);
  });

  it("orders entries by the after version's order, falling back to before's", () => {
    const before = [block({ block_type: "task", body: "a", order: 1 }), block({ block_type: "role", body: "b", order: 0 })];
    const after = [block({ block_type: "task", body: "a", order: 0 }), block({ block_type: "role", body: "b", order: 1 })];
    const result = diffBlocks(before, after);
    expect(result.map((r) => r.blockType)).toEqual(["task", "role"]);
  });
});

describe("patchBlock", () => {
  it("replaces only the targeted block's body, locking it", () => {
    const blocks = [
      block({ block_type: "task", body: "old task", state: "locked" }),
      block({ block_type: "role", body: "unrelated", state: "locked", order: 1 }),
    ];
    const result = patchBlock(blocks, "task", "new task");
    expect(result.find((b) => b.block_type === "task")!.body).toBe("new task");
    expect(result.find((b) => b.block_type === "task")!.state).toBe("locked");
    expect(result.find((b) => b.block_type === "role")).toEqual(blocks[1]);
  });

  it("is a no-op when the block type isn't present", () => {
    const blocks = [block({ block_type: "task", body: "x" })];
    expect(patchBlock(blocks, "format", "y")).toEqual(blocks);
  });
});
