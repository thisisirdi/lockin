"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/fetch-json";
import type { Prompt, PromptVersion } from "@/lib/types";
import type { BlockDiffEntry } from "@/lib/studio/diff";

export function usePromptVersions(promptId: string | null) {
  const queryClient = useQueryClient();
  const key = ["prompt-versions", promptId] as const;

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () =>
      fetchJSON<{ versions: PromptVersion[] }>(`/api/prompts/${promptId}/versions`).then(
        (r) => r.versions
      ),
    enabled: Boolean(promptId),
  });

  const promoteMutation = useMutation({
    mutationFn: (versionId: string) =>
      fetchJSON<{ prompt: Prompt }>(`/api/prompts/${promptId}/promote`, {
        method: "POST",
        body: JSON.stringify({ versionId }),
      }).then((r) => r.prompt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });

  return {
    versions: data ?? [],
    loading: isLoading,
    promoteVersion: (versionId: string) => promoteMutation.mutateAsync(versionId),
  };
}

export async function fetchVersionDiff(promptId: string, a: string, b: string) {
  return fetchJSON<{ a: { id: string; versionNo: number }; b: { id: string; versionNo: number }; entries: BlockDiffEntry[] }>(
    `/api/prompts/${promptId}/versions/${a}/diff/${b}`
  );
}
