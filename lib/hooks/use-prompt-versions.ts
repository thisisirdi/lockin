"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/fetch-json";
import type { PromptVersion } from "@/lib/types";

export function usePromptVersions(promptId: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ["prompt-versions", promptId],
    queryFn: () =>
      fetchJSON<{ versions: PromptVersion[] }>(`/api/prompts/${promptId}/versions`).then(
        (r) => r.versions
      ),
    enabled: Boolean(promptId),
  });

  return { versions: data ?? [], loading: isLoading };
}
