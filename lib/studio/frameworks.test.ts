import { describe, it, expect } from "vitest";
import { applyFramework } from "@/lib/studio/frameworks";
import type { Framework, PromptBlock } from "@/lib/types";

function framework(key: string, slots: [string, PromptBlock["block_type"], boolean][]): Framework {
  return {
    id: crypto.randomUUID(),
    key,
    name: key.toUpperCase(),
    acronym_expansion: "",
    source_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    slot_map: slots.map(([slot, block_type, required]) => ({
      slot,
      label: slot,
      block_type,
      required,
    })),
  };
}

const RTF = framework("rtf", [
  ["role", "role", true],
  ["task", "task", true],
  ["format", "format", true],
]);

const CREATE = framework("create", [
  ["character", "role", true],
  ["request", "task", true],
  ["example", "examples", false],
  ["adjustment", "constraints", false],
  ["type_of_output", "format", true],
  ["extras", "guardrails", false],
]);

const KERNEL = framework("kernel", [
  ["knowledge", "context", true],
  ["engagement", "role", false],
  ["relevance", "task", true],
  ["nuance", "constraints", false],
  ["execution", "format", true],
  ["learning", "guardrails", false],
]);

const CO_STAR = framework("co-star", [
  ["context", "context", true],
  ["objective", "task", true],
  ["style", "constraints", false],
  ["tone", "guardrails", false],
  ["audience", "role", false],
  ["response", "format", true],
]);

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

describe("applyFramework", () => {
  it("assigns framework_slot and order to blocks whose type matches a slot", () => {
    const blocks = [block({ block_type: "task", body: "Do X" }), block({ block_type: "role", body: "You are Y" })];
    const result = applyFramework(blocks, RTF);

    const role = result.find((b) => b.block_type === "role")!;
    const task = result.find((b) => b.block_type === "task")!;
    expect(role.framework_slot).toBe("role");
    expect(role.order).toBe(0);
    expect(task.framework_slot).toBe("task");
    expect(task.order).toBe(1);
  });

  it("never rewrites content — body and state stay byte-identical", () => {
    const original = block({ block_type: "task", body: "Exact original text", state: "draft" });
    const [result] = applyFramework([original], RTF).filter((b) => b.block_type === "task");
    expect(result.body).toBe(original.body);
    expect(result.state).toBe(original.state);
    expect(result.id).toBe(original.id);
  });

  it("creates an empty placeholder for a required slot with no existing block", () => {
    const result = applyFramework([], RTF);
    expect(result).toHaveLength(3);
    expect(result.every((b) => b.state === "empty" && b.body === "")).toBe(true);
    expect(result.map((b) => b.framework_slot)).toEqual(["role", "task", "format"]);
  });

  it("moves a block with no slot in the target framework to the Additional group", () => {
    const examples = block({ block_type: "examples", body: "Example content" });
    const result = applyFramework([examples], RTF);
    const moved = result.find((b) => b.block_type === "examples")!;
    expect(moved.framework_slot).toBeNull();
    expect(moved.body).toBe("Example content");
    // Additional blocks sort after every mapped slot.
    expect(moved.order).toBeGreaterThanOrEqual(RTF.slot_map.length);
  });

  it("keeps unmapped blocks in the resolved output (order preserved relative to each other)", () => {
    const a = block({ block_type: "examples", body: "A" });
    const b = block({ block_type: "guardrails", body: "B" });
    const result = applyFramework([a, b], RTF);
    const additional = result.filter((x) => x.framework_slot === null);
    expect(additional.map((x) => x.body)).toEqual(["A", "B"]);
  });

  it("round trip CREATE -> KERNEL -> CO-STAR -> CREATE leaves every block byte-identical", () => {
    const start: PromptBlock[] = [
      block({ block_type: "role", body: "You are a support engineer." }),
      block({ block_type: "task", body: "Write a runbook." }),
      block({ block_type: "format", body: "Use numbered steps." }),
    ];

    const afterKernel = applyFramework(start, KERNEL);
    const afterCoStar = applyFramework(afterKernel, CO_STAR);
    const backToCreate = applyFramework(afterCoStar, CREATE);

    const byType = (blocks: PromptBlock[], type: PromptBlock["block_type"]) =>
      blocks.find((b) => b.block_type === type);

    for (const type of ["role", "task", "format"] as const) {
      expect(byType(backToCreate, type)!.body).toBe(byType(start, type)!.body);
      expect(byType(backToCreate, type)!.id).toBe(byType(start, type)!.id);
      expect(byType(backToCreate, type)!.state).toBe(byType(start, type)!.state);
    }
  });
});
