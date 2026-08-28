"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/fetch-json";
import type { ContextBlock, ContextBlockKind } from "@/lib/types";

const contextBlocksKey = ["context-blocks"] as const;

interface ContextBlockPatch {
  kind?: ContextBlockKind;
  name?: string;
  body?: string;
  archived?: boolean;
}

export function useContextBlocks(enabled = true) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: contextBlocksKey,
    queryFn: () =>
      fetchJSON<{ contextBlocks: ContextBlock[] }>("/api/context-blocks").then((r) => r.contextBlocks),
    enabled,
  });
  const contextBlocks = data ?? [];

  const createMutation = useMutation({
    mutationFn: (vars: { kind: ContextBlockKind; name: string; body: string }) =>
      fetchJSON<{ contextBlock: ContextBlock }>("/api/context-blocks", {
        method: "POST",
        body: JSON.stringify(vars),
      }).then((r) => r.contextBlock),
    onSuccess: (block) => {
      queryClient.setQueryData<ContextBlock[]>(contextBlocksKey, (prev) => [block, ...(prev ?? [])]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; patch: ContextBlockPatch }) =>
      fetchJSON<{ contextBlock: ContextBlock }>(`/api/context-blocks/${vars.id}`, {
        method: "PATCH",
        body: JSON.stringify(vars.patch),
      }).then((r) => r.contextBlock),
    onSuccess: (block, vars) => {
      if (vars.patch.archived) {
        queryClient.setQueryData<ContextBlock[]>(contextBlocksKey, (prev) =>
          (prev ?? []).filter((b) => b.id !== block.id)
        );
      } else {
        queryClient.setQueryData<ContextBlock[]>(contextBlocksKey, (prev) =>
          (prev ?? []).map((b) => (b.id === block.id ? block : b))
        );
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/context-blocks/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<ContextBlock[]>(contextBlocksKey, (prev) =>
        (prev ?? []).filter((b) => b.id !== id)
      );
    },
  });

  return {
    contextBlocks,
    loading: isLoading,
    createContextBlock: (kind: ContextBlockKind, name: string, body: string) =>
      createMutation.mutateAsync({ kind, name, body }),
    updateContextBlock: (id: string, patch: ContextBlockPatch) => updateMutation.mutateAsync({ id, patch }),
    archiveContextBlock: (id: string) => updateMutation.mutateAsync({ id, patch: { archived: true } }),
    deleteContextBlock: (id: string) => deleteMutation.mutateAsync(id),
    refresh: () => queryClient.invalidateQueries({ queryKey: contextBlocksKey }),
  };
}
