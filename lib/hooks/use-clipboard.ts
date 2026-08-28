"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/fetch-json";
import type { ClipboardItem } from "@/lib/types";

const clipboardKey = ["clipboard"] as const;

export function useClipboardHistory(enabled = true) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: clipboardKey,
    queryFn: () => fetchJSON<{ items: ClipboardItem[] }>("/api/clipboard").then((r) => r.items),
    enabled,
  });
  const items = data ?? [];

  const removeMutation = useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/clipboard?id=${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<ClipboardItem[]>(clipboardKey, (prev) =>
        (prev ?? []).filter((i) => i.id !== id)
      );
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => fetchJSON("/api/clipboard", { method: "DELETE" }),
    onSuccess: () => queryClient.setQueryData<ClipboardItem[]>(clipboardKey, []),
  });

  return {
    items,
    loading: isLoading,
    load: () => refetch(),
    refresh: () => refetch(),
    remove: (id: string) => removeMutation.mutateAsync(id),
    clear: () => clearMutation.mutateAsync(),
  };
}
