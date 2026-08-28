import type { PromptBlock, PromptVariable } from "@/lib/types";
import { BLOCK_LABELS } from "@/lib/studio/constants";

export interface ResolveContextBlock {
  name: string;
  body: string;
  position?: number;
}

export interface ResolveInput {
  blocks: PromptBlock[];
  variables?: PromptVariable[];
  variableValues?: Record<string, string>;
  context?: ResolveContextBlock[];
}

export interface ResolveResult {
  resolvedPrompt: string;
  tokenEstimate: number;
  missingRequiredVariables: string[];
}

/** ~4 chars/token, the standard rough estimator for English prose. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function substituteVariables(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) =>
    key in values && values[key] !== "" ? values[key] : match
  );
}

/** Blocks + variables + context -> resolved prompt + token estimate. Shared by client preview and every server route — the two must never diverge. */
export function resolvePrompt(input: ResolveInput): ResolveResult {
  const { blocks, variables = [], variableValues = {}, context = [] } = input;

  const missingRequiredVariables = variables
    .filter((v) => v.required && !(variableValues[v.key] ?? "").trim())
    .map((v) => v.key);

  const orderedBlocks = [...blocks]
    .filter((b) => b.state !== "empty" && b.body.trim())
    .sort((a, b) => a.order - b.order);

  const orderedContext = [...context].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const contextSection =
    orderedContext.length > 0
      ? `Context:\n${orderedContext.map((c) => `- ${c.name}: ${c.body}`).join("\n")}\n\n`
      : "";

  const blockSections = orderedBlocks
    .map((b) => `${BLOCK_LABELS[b.block_type]}:\n${substituteVariables(b.body, variableValues)}`)
    .join("\n\n");

  const resolvedPrompt = (contextSection + blockSections).trim();

  return {
    resolvedPrompt,
    tokenEstimate: estimateTokens(resolvedPrompt),
    missingRequiredVariables,
  };
}
