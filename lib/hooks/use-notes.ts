"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJSON } from "@/lib/fetch-json";
import type { Note } from "@/lib/types";

export function useNotes(query: string, tag: string | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (tag) params.set("tag", tag);
      const { notes } = await fetchJSON<{ notes: Note[] }>(
        `/api/notes?${params.toString()}`
      );
      setNotes(notes);
    } finally {
      setLoading(false);
    }
  }, [query, tag]);

  useEffect(() => {
    const id = setTimeout(refresh, 200);
    return () => clearTimeout(id);
  }, [refresh]);

  const createNote = useCallback(async () => {
    const { note } = await fetchJSON<{ note: Note }>("/api/notes", {
      method: "POST",
      body: JSON.stringify({ title: "Untitled", body: "", tags: [] }),
    });
    setNotes((prev) => [note, ...prev]);
    return note;
  }, []);

  const updateNote = useCallback(async (id: string, patch: Partial<Note>) => {
    const { note } = await fetchJSON<{ note: Note }>(`/api/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setNotes((prev) => prev.map((n) => (n.id === id ? note : n)));
    return note;
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    await fetchJSON(`/api/notes/${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notes, loading, createNote, updateNote, deleteNote };
}
