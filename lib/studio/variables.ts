import type { PromptBlock, PromptVariable } from "@/lib/types";

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Distinct {{var}} keys referenced anywhere in the given blocks' bodies, in block-order, first-seen order. */
export function detectVariableKeys(blocks: PromptBlock[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const block of [...blocks].sort((a, b) => a.order - b.order)) {
    for (const match of block.body.matchAll(VARIABLE_PATTERN)) {
      const key = match[1];
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(key);
      }
    }
  }
  return ordered;
}

/**
 * Reconciles tracked variables against what's actually referenced in the
 * blocks: keeps existing config (type, label, default, required) for a key
 * still in use, adds a plain text/required default for a newly-referenced
 * key, and drops entries for keys no longer referenced anywhere.
 */
export function syncVariables(blocks: PromptBlock[], variables: PromptVariable[]): PromptVariable[] {
  const keys = detectVariableKeys(blocks);
  const byKey = new Map(variables.map((v) => [v.key, v]));
  return keys.map(
    (key) => byKey.get(key) ?? { key, label: key, type: "text", required: true }
  );
}
