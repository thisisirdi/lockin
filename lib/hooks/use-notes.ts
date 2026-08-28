"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/fetch-json";
import type { Note } from "@/lib/types";

function notesKey(query: string, tag: string | null) {
  return ["notes", query, tag] as const;
}

export function useNotes(query: string, tag: string | null, enabled = true) {
  const queryClient = useQueryClient();
  const key = notesKey(query, tag);

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (tag) params.set("tag", tag);
      return fetchJSON<{ notes: Note[] }>(`/api/notes?${params.toString()}`).then((r) => r.notes);
    },
    enabled,
  });
  const notes = data ?? [];

  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: ["notes"] });

  const createMutation = useMutation({
    mutationFn: () =>
      fetchJSON<{ note: Note }>("/api/notes", {
        method: "POST",
        body: JSON.stringify({ title: "Untitled", body: "", tags: [] }),
      }).then((r) => r.note),
    onSuccess: () => invalidateAll(),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; patch: Partial<Note> }) =>
      fetchJSON<{ note: Note }>(`/api/notes/${vars.id}`, {
        method: "PATCH",
        body: JSON.stringify(vars.patch),
      }).then((r) => r.note),
    onSuccess: () => invalidateAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateAll(),
  });

  return {
    notes,
    loading: isLoading,
    createNote: () => createMutation.mutateAsync(),
    updateNote: (id: string, patch: Partial<Note>) => updateMutation.mutateAsync({ id, patch }),
    deleteNote: (id: string) => deleteMutation.mutateAsync(id),
  };
}
