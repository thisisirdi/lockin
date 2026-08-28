import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_KEY_HEADER } from "@/lib/anthropic/constants";

let envClient: Anthropic | null = null;

/** Pass the caller's own key (BYO key) to bill their account instead of ours. */
export function getAnthropicClient(userKey?: string | null) {
  if (userKey) return new Anthropic({ apiKey: userKey });
  if (!envClient) envClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return envClient;
}

/** Reads the BYO key a client attached via `fetchJSON`, if any. Never logged, never stored. */
export function userKeyFromRequest(request: Request): string | null {
  return request.headers.get(ANTHROPIC_KEY_HEADER)?.trim() || null;
}

export function hasAnyKey(userKey: string | null) {
  return Boolean(userKey || process.env.ANTHROPIC_API_KEY);
}

export function firstText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Anthropic API returned no text content");
  }
  return block.text.trim();
}

export const COMPANION_MODEL = "claude-sonnet-5";
