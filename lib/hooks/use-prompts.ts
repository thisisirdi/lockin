"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/fetch-json";
import type { Prompt } from "@/lib/types";

function promptsKey(query: string, tag: string | null) {
  return ["prompts", query, tag] as const;
}

export function usePrompts(query = "", tag: string | null = null, enabled = true) {
  const queryClient = useQueryClient();
  const key = promptsKey(query, tag);

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (tag) params.set("tag", tag);
      return fetchJSON<{ prompts: Prompt[] }>(`/api/prompts?${params.toString()}`).then((r) => r.prompts);
    },
    enabled,
  });
  const prompts = data ?? [];

  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: ["prompts"] });

  const createMutation = useMutation({
    mutationFn: (vars: {
      title: string;
      body?: string;
      tags?: string[];
      description?: string;
      deliverableType?: string;
      frameworkId?: string | null;
    }) =>
      fetchJSON<{ prompt: Prompt }>("/api/prompts", {
        method: "POST",
        body: JSON.stringify(vars),
      }).then((r) => r.prompt),
    onSuccess: () => invalidateAll(),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; patch: Partial<Prompt> & { archived?: boolean } }) =>
      fetchJSON<{ prompt: Prompt }>(`/api/prompts/${vars.id}`, {
        method: "PATCH",
        body: JSON.stringify(vars.patch),
      }).then((r) => r.prompt),
    onSuccess: () => invalidateAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/prompts/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateAll(),
  });

  const trackUsageMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ prompt: Prompt }>(`/api/prompts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ incrementUsage: true }),
      }).then((r) => r.prompt),
    onSuccess: (prompt) => {
      queryClient.setQueryData<Prompt[]>(key, (prev) =>
        (prev ?? []).map((p) => (p.id === prompt.id ? prompt : p))
      );
    },
  });

  return {
    prompts,
    loading: isLoading,
    createPrompt: (
      title: string,
      body = "",
      tags: string[] = [],
      extra?: { description?: string; deliverableType?: string; frameworkId?: string | null }
    ) => createMutation.mutateAsync({ title, body, tags, ...extra }),
    updatePrompt: (id: string, patch: Partial<Prompt>) => updateMutation.mutateAsync({ id, patch }),
    archivePrompt: (id: string) => updateMutation.mutateAsync({ id, patch: { archived: true } }),
    deletePrompt: (id: string) => deleteMutation.mutateAsync(id),
    trackUsage: (id: string) => trackUsageMutation.mutateAsync(id).catch(() => {}),
  };
}
