"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJSON } from "@/lib/fetch-json";
import type { Prompt } from "@/lib/types";

export function usePrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { prompts } = await fetchJSON<{ prompts: Prompt[] }>("/api/prompts");
      setPrompts(prompts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createPrompt = useCallback(
    async (title: string, body: string, tags: string[] = []) => {
      const { prompt } = await fetchJSON<{ prompt: Prompt }>("/api/prompts", {
        method: "POST",
        body: JSON.stringify({ title, body, tags }),
      });
      setPrompts((prev) => [prompt, ...prev]);
      return prompt;
    },
    []
  );

  const updatePrompt = useCallback(async (id: string, patch: Partial<Prompt>) => {
    const { prompt } = await fetchJSON<{ prompt: Prompt }>(`/api/prompts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setPrompts((prev) => prev.map((p) => (p.id === id ? prompt : p)));
    return prompt;
  }, []);

  const deletePrompt = useCallback(async (id: string) => {
    await fetchJSON(`/api/prompts/${id}`, { method: "DELETE" });
    setPrompts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const trackUsage = useCallback(async (id: string) => {
    await fetchJSON(`/api/prompts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ incrementUsage: true }),
    }).catch(() => {});
  }, []);

  return { prompts, loading, createPrompt, updatePrompt, deletePrompt, trackUsage };
}
