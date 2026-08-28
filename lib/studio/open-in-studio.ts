"use client";

import { fetchJSON } from "@/lib/fetch-json";
import { useStudioStore } from "@/lib/store/studio";
import { useOSStore } from "@/lib/store/os";
import type { Prompt, PromptVersion, Framework, PromptBlock } from "@/lib/types";

/** Loads a saved prompt's latest version into the Studio composer and brings the window up. */
export async function openPromptInStudio(
  prompt: Prompt,
  frameworks: Framework[],
  stage: { width: number; height: number }
) {
  const { versions } = await fetchJSON<{ versions: PromptVersion[] }>(
    `/api/prompts/${prompt.id}/versions`
  );
  const version = versions.find((v) => v.id === prompt.current_version_id) ?? versions[0] ?? null;

  // Pre-Studio prompts created before a version ever existed for them fall back
  // to their raw body as a single locked block, same shape the 0002 migration
  // backfill used.
  const blocks: PromptBlock[] = version
    ? version.blocks
    : [
        {
          id: crypto.randomUUID(),
          block_type: "task",
          framework_slot: null,
          body: prompt.body,
          state: "locked",
          order: 0,
        },
      ];

  const framework = frameworks.find((f) => f.id === prompt.framework_id) ?? null;

  useStudioStore.getState().loadPrompt({
    promptId: prompt.id,
    currentVersionId: version?.id ?? null,
    title: prompt.title,
    deliverableType: prompt.deliverable_type,
    framework,
    blocks,
    variables: version?.variables ?? [],
  });
  useOSStore.getState().show("studio", stage);
}
