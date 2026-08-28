import { describe, it, expect } from "vitest";
import { detectVariableKeys, syncVariables } from "@/lib/studio/variables";
import type { PromptBlock, PromptVariable } from "@/lib/types";

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

describe("detectVariableKeys", () => {
  it("finds a variable reference", () => {
    expect(detectVariableKeys([block({ body: "Summarize {{doc}}." })])).toEqual(["doc"]);
  });

  it("dedupes repeated references", () => {
    expect(detectVariableKeys([block({ body: "{{x}} and {{x}} again" })])).toEqual(["x"]);
  });

  it("tolerates whitespace inside braces", () => {
    expect(detectVariableKeys([block({ body: "{{ name }}" })])).toEqual(["name"]);
  });

  it("orders keys by block order, then first appearance", () => {
    const blocks = [
      block({ body: "uses {{second}}", order: 1 }),
      block({ body: "uses {{first}} then {{second}}", order: 0 }),
    ];
    expect(detectVariableKeys(blocks)).toEqual(["first", "second"]);
  });

  it("returns nothing when there are no placeholders", () => {
    expect(detectVariableKeys([block({ body: "plain text" })])).toEqual([]);
  });
});

describe("syncVariables", () => {
  it("adds a default entry for a newly-detected key", () => {
    const result = syncVariables([block({ body: "{{doc}}" })], []);
    expect(result).toEqual([{ key: "doc", label: "doc", type: "text", required: true }]);
  });

  it("preserves existing config for a key still referenced", () => {
    const existing: PromptVariable[] = [
      { key: "doc", label: "Document", type: "select", required: false, options: ["a", "b"] },
    ];
    const result = syncVariables([block({ body: "{{doc}}" })], existing);
    expect(result).toEqual(existing);
  });

  it("drops a variable no longer referenced anywhere", () => {
    const existing: PromptVariable[] = [{ key: "gone", label: "Gone", type: "text", required: true }];
    const result = syncVariables([block({ body: "no placeholders here" })], existing);
    expect(result).toEqual([]);
  });
});
