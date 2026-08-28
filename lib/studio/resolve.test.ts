import { describe, it, expect } from "vitest";
import { resolvePrompt, substituteVariables, estimateTokens } from "@/lib/studio/resolve";
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

describe("estimateTokens", () => {
  it("is zero for empty text", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("estimates roughly 4 chars per token", () => {
    expect(estimateTokens("a".repeat(40))).toBe(10);
  });
});

describe("substituteVariables", () => {
  it("replaces a known variable", () => {
    expect(substituteVariables("Hello {{name}}", { name: "Ada" })).toBe("Hello Ada");
  });

  it("leaves an unknown variable untouched", () => {
    expect(substituteVariables("Hello {{name}}", {})).toBe("Hello {{name}}");
  });

  it("leaves an empty-string value untouched (treated as unset)", () => {
    expect(substituteVariables("Hello {{name}}", { name: "" })).toBe("Hello {{name}}");
  });

  it("handles multiple occurrences and whitespace inside braces", () => {
    expect(substituteVariables("{{ x }} and {{x}}", { x: "5" })).toBe("5 and 5");
  });
});

describe("resolvePrompt", () => {
  it("joins locked blocks in order, labelled by block type", () => {
    const result = resolvePrompt({
      blocks: [
        block({ block_type: "task", body: "Write a summary.", order: 1 }),
        block({ block_type: "role", body: "You are a technical writer.", order: 0 }),
      ],
    });
    expect(result.resolvedPrompt).toBe(
      "Role:\nYou are a technical writer.\n\nTask:\nWrite a summary."
    );
  });

  it("skips blocks in the empty state even if body somehow has text", () => {
    const result = resolvePrompt({
      blocks: [
        block({ block_type: "task", body: "Real content", state: "locked", order: 0 }),
        block({ block_type: "constraints", body: "", state: "empty", order: 1 }),
      ],
    });
    expect(result.resolvedPrompt).toBe("Task:\nReal content");
  });

  it("includes draft (unlocked but non-empty) blocks for a live preview", () => {
    const result = resolvePrompt({
      blocks: [block({ block_type: "task", body: "Still drafting", state: "draft", order: 0 })],
    });
    expect(result.resolvedPrompt).toContain("Still drafting");
  });

  it("substitutes variables inside block bodies", () => {
    const result = resolvePrompt({
      blocks: [block({ block_type: "task", body: "Summarize {{doc}}.", order: 0 })],
      variables: [{ key: "doc", label: "Document", type: "text", required: true }],
      variableValues: { doc: "the Q3 report" },
    });
    expect(result.resolvedPrompt).toBe("Task:\nSummarize the Q3 report.");
  });

  it("reports missing required variables without failing", () => {
    const result = resolvePrompt({
      blocks: [block({ block_type: "task", body: "Summarize {{doc}}.", order: 0 })],
      variables: [{ key: "doc", label: "Document", type: "text", required: true }],
      variableValues: {},
    });
    expect(result.missingRequiredVariables).toEqual(["doc"]);
    expect(result.resolvedPrompt).toContain("{{doc}}");
  });

  it("does not flag an optional variable as missing", () => {
    const result = resolvePrompt({
      blocks: [block({ body: "x" })],
      variables: [{ key: "opt", label: "Optional", type: "text", required: false }],
      variableValues: {},
    });
    expect(result.missingRequiredVariables).toEqual([]);
  });

  it("orders context blocks by position and prefixes the prompt", () => {
    const result = resolvePrompt({
      blocks: [block({ body: "Do the task." })],
      context: [
        { name: "Stack", body: "Next.js + Supabase", position: 1 },
        { name: "Company", body: "Acme Inc", position: 0 },
      ],
    });
    expect(result.resolvedPrompt).toBe(
      "Context:\n- Company: Acme Inc\n- Stack: Next.js + Supabase\n\nTask:\nDo the task."
    );
  });

  it("computes a token estimate over the full resolved text", () => {
    const result = resolvePrompt({ blocks: [block({ body: "a".repeat(20) })] });
    expect(result.tokenEstimate).toBe(estimateTokens(result.resolvedPrompt));
    expect(result.tokenEstimate).toBeGreaterThan(0);
  });

  it("returns an empty prompt for no content", () => {
    const result = resolvePrompt({ blocks: [] });
    expect(result.resolvedPrompt).toBe("");
    expect(result.tokenEstimate).toBe(0);
  });
});
