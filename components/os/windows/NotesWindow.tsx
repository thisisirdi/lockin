"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { OSWindow } from "@/components/os/Window";
import { useNotes } from "@/lib/hooks/use-notes";
import { useOSStore } from "@/lib/store/os";
import { copyWithHistory } from "@/lib/copy";
import { fetchJSON } from "@/lib/fetch-json";
import { toast } from "sonner";
import { NotebookPen, Copy, Plus, Sparkles } from "lucide-react";

export function NotesWindow({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const visible = useOSStore((s) => s.windows.notes.visible);
  const { notes, createNote, updateNote } = useNotes("", null, visible);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const queryClient = useQueryClient();

  async function promoteToContext(noteId: string) {
    try {
      await fetchJSON(`/api/notes/${noteId}/promote`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["context-blocks"] });
      toast.success("Added to Context in Studio");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't promote that note");
    }
  }

  return (
    <OSWindow id="notes" icon={<NotebookPen className="h-[13px] w-[13px]" strokeWidth={1.9} />} stageRef={stageRef}>
      <div className="flex flex-col gap-2 px-3.5 pb-3.5 pt-3">
        <button
          onClick={async () => {
            const note = await createNote();
            setDraftId(note.id);
            setDraftBody("");
          }}
          className="flex items-center justify-center gap-1.5 rounded-[9px] border py-[7px] text-[12.5px]"
          style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
        >
          <Plus className="h-3.5 w-3.5" /> New note
        </button>

        <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
          {notes.slice(0, 8).map((note) => {
            const editing = draftId === note.id;
            return (
              <div
                key={note.id}
                className="flex flex-col gap-1 rounded-[11px] border p-2.5"
                style={{ borderColor: "var(--edge-soft)", background: "rgba(255,255,255,0.045)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px]">{note.title}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => promoteToContext(note.id)}
                      title="Add to Context in Studio"
                      className="text-white/50 hover:text-white"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => copyWithHistory(note.body, "note")}
                      title="Copy"
                      className="text-white/50 hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {editing ? (
                  <textarea
                    autoFocus
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    onBlur={() => {
                      updateNote(note.id, { body: draftBody });
                      setDraftId(null);
                    }}
                    className="min-h-16 resize-none bg-transparent text-[12px] leading-relaxed outline-none"
                    style={{ color: "var(--dim)" }}
                  />
                ) : (
                  <p
                    onClick={() => {
                      setDraftId(note.id);
                      setDraftBody(note.body);
                    }}
                    className="line-clamp-2 cursor-text text-[12px] leading-relaxed"
                    style={{ color: "var(--dim)" }}
                  >
                    {note.body || "Click to write…"}
                  </p>
                )}
              </div>
            );
          })}
          {notes.length === 0 && (
            <p className="py-3 text-center text-[12.5px]" style={{ color: "var(--dim2)" }}>
              No notes yet.
            </p>
          )}
        </div>
      </div>
    </OSWindow>
  );
}
