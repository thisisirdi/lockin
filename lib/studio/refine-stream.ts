"use client";

import { getStoredApiKey, ANTHROPIC_KEY_HEADER } from "@/lib/anthropic/key-vault";
import { CHANGE_NOTE_MARKER } from "@/lib/anthropic/constants";
import type { BlockType } from "@/lib/types";

export interface RefineBlockParams {
  blockType: BlockType;
  draft: string;
  deliverableType: string | null;
  lockedBlocks: { blockType: BlockType; body: string }[];
}

export interface RefineBlockResult {
  refined: string;
  changeNote: string;
}

/** Streams `/api/studio/refine-block`, calling `onDelta` with the accumulated refined text so far. */
export async function streamRefineBlock(
  params: RefineBlockParams,
  onDelta: (textSoFar: string) => void
): Promise<RefineBlockResult> {
  const apiKey = getStoredApiKey();
  const res = await fetch("/api/studio/refine-block", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { [ANTHROPIC_KEY_HEADER]: apiKey } : {}),
    },
    body: JSON.stringify(params),
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Refinement failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    const [refinedSoFar] = full.split(CHANGE_NOTE_MARKER);
    onDelta(refinedSoFar);
  }

  const [refined, changeNote] = full.split(CHANGE_NOTE_MARKER);
  return { refined: refined.trim(), changeNote: (changeNote ?? "").trim() };
}
