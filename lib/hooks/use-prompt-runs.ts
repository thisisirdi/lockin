"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/fetch-json";
import type { PromptRun, BlockType } from "@/lib/types";

export interface PatchSuggestion {
  blockType: BlockType;
  before: string;
  after: string;
}

export function usePromptRuns(promptId: string | null) {
  const queryClient = useQueryClient();
  const key = ["prompt-runs", promptId] as const;

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchJSON<{ runs: PromptRun[] }>(`/api/prompts/${promptId}/runs`).then((r) => r.runs),
    enabled: Boolean(promptId),
  });

  const rateMutation = useMutation({
    mutationFn: (vars: { runId: string; rating: number }) =>
      fetchJSON<{ run: PromptRun }>(`/api/runs/${vars.runId}`, {
        method: "PATCH",
        body: JSON.stringify({ rating: vars.rating }),
      }).then((r) => r.run),
    onSuccess: (run) => {
      queryClient.setQueryData<PromptRun[]>(key, (prev) =>
        (prev ?? []).map((r) => (r.id === run.id ? run : r))
      );
    },
  });

  const tagMutation = useMutation({
    mutationFn: (vars: { runId: string; critiqueTags: string[] }) =>
      fetchJSON<{ run: PromptRun }>(`/api/runs/${vars.runId}`, {
        method: "PATCH",
        body: JSON.stringify({ critiqueTags: vars.critiqueTags }),
      }).then((r) => r.run),
    onSuccess: (run) => {
      queryClient.setQueryData<PromptRun[]>(key, (prev) =>
        (prev ?? []).map((r) => (r.id === run.id ? run : r))
      );
    },
  });

  const patchSuggestionMutation = useMutation({
    mutationFn: (vars: { runId: string; critiqueTag: string }) =>
      fetchJSON<PatchSuggestion>(`/api/runs/${vars.runId}/patch-suggestion`, {
        method: "POST",
        body: JSON.stringify({ critiqueTag: vars.critiqueTag }),
      }),
  });

  return {
    runs: data ?? [],
    loading: isLoading,
    rateRun: (runId: string, rating: number) => rateMutation.mutateAsync({ runId, rating }),
    setCritiqueTags: (runId: string, critiqueTags: string[]) =>
      tagMutation.mutateAsync({ runId, critiqueTags }),
    requestPatch: (runId: string, critiqueTag: string) =>
      patchSuggestionMutation.mutateAsync({ runId, critiqueTag }),
  };
}
