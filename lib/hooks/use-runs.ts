"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/fetch-json";
import type { PromptRun } from "@/lib/types";

/** Minimal run recording for the copy-out paste-back flow. Rating/listing UI is Phase 3. */
export function useRuns() {
  const createMutation = useMutation({
    mutationFn: (vars: { promptVersionId: string; resolvedPrompt: string; variableValues?: Record<string, string> }) =>
      fetchJSON<{ run: PromptRun }>("/api/runs", {
        method: "POST",
        body: JSON.stringify(vars),
      }).then((r) => r.run),
  });

  const recordOutputMutation = useMutation({
    mutationFn: (vars: { runId: string; output: string }) =>
      fetchJSON<{ run: PromptRun }>(`/api/runs/${vars.runId}`, {
        method: "PATCH",
        body: JSON.stringify({ output: vars.output }),
      }).then((r) => r.run),
  });

  return {
    createRun: (promptVersionId: string, resolvedPrompt: string, variableValues?: Record<string, string>) =>
      createMutation.mutateAsync({ promptVersionId, resolvedPrompt, variableValues }),
    recordOutput: (runId: string, output: string) => recordOutputMutation.mutateAsync({ runId, output }),
  };
}
