"use client";

import { useMemo, useState } from "react";
import { useNotes } from "@/lib/hooks/use-notes";
import { NoteCard } from "@/components/notes/note-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NotesPage() {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes(query, tag);

  const allTags = useMemo(
    () => Array.from(new Set(notes.flatMap((n) => n.tags))).sort(),
    [notes]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notes</h1>
        <Button onClick={() => createNote()} className="gap-2">
          <Plus className="h-4 w-4" /> New note
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes…"
          className="pl-9"
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={tag === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setTag(null)}
          >
            All
          </Badge>
          {allTags.map((t) => (
            <Badge
              key={t}
              variant={tag === t ? "default" : "outline"}
              className={cn("cursor-pointer")}
              onClick={() => setTag(tag === t ? null : t)}
            >
              {t}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onSave={(patch) => updateNote(note.id, patch)}
            onDelete={() => deleteNote(note.id)}
          />
        ))}
      </div>

      {!loading && notes.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No notes yet. Jot something down during your next session.
        </p>
      )}
    </div>
  );
}
