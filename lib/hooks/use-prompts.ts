"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/fetch-json";
import type { Prompt } from "@/lib/types";

const promptsKey = ["prompts"] as const;

export function usePrompts(enabled = true) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: promptsKey,
    queryFn: () => fetchJSON<{ prompts: Prompt[] }>("/api/prompts").then((r) => r.prompts),
    enabled,
  });
  const prompts = data ?? [];

  const createMutation = useMutation({
    mutationFn: (vars: { title: string; body: string; tags: string[] }) =>
      fetchJSON<{ prompt: Prompt }>("/api/prompts", {
        method: "POST",
        body: JSON.stringify(vars),
      }).then((r) => r.prompt),
    onSuccess: (prompt) => {
      queryClient.setQueryData<Prompt[]>(promptsKey, (prev) => [prompt, ...(prev ?? [])]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; patch: Partial<Prompt> }) =>
      fetchJSON<{ prompt: Prompt }>(`/api/prompts/${vars.id}`, {
        method: "PATCH",
        body: JSON.stringify(vars.patch),
      }).then((r) => r.prompt),
    onSuccess: (prompt) => {
      queryClient.setQueryData<Prompt[]>(promptsKey, (prev) =>
        (prev ?? []).map((p) => (p.id === prompt.id ? prompt : p))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/prompts/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Prompt[]>(promptsKey, (prev) => (prev ?? []).filter((p) => p.id !== id));
    },
  });

  const trackUsageMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJSON<{ prompt: Prompt }>(`/api/prompts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ incrementUsage: true }),
      }).then((r) => r.prompt),
    onSuccess: (prompt) => {
      queryClient.setQueryData<Prompt[]>(promptsKey, (prev) =>
        (prev ?? []).map((p) => (p.id === prompt.id ? prompt : p))
      );
    },
  });

  return {
    prompts,
    loading: isLoading,
    createPrompt: (title: string, body: string, tags: string[] = []) =>
      createMutation.mutateAsync({ title, body, tags }),
    updatePrompt: (id: string, patch: Partial<Prompt>) => updateMutation.mutateAsync({ id, patch }),
    deletePrompt: (id: string) => deleteMutation.mutateAsync(id),
    trackUsage: (id: string) => trackUsageMutation.mutateAsync(id).catch(() => {}),
  };
}
