"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { fetchJSON } from "@/lib/fetch-json";
import { copyWithHistory } from "@/lib/copy";
import { useTimerStore } from "@/lib/store/timer";
import type { Note } from "@/lib/types";
import { NotebookPen, Copy, Save } from "lucide-react";
import { toast } from "sonner";

export function QuickNoteSheet() {
  const isActive = useTimerStore((s) => s.status !== "idle");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<Note[]>([]);

  useEffect(() => {
    if (!isActive) return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive]);

  useEffect(() => {
    if (!open) return;
    fetchJSON<{ notes: Note[] }>("/api/notes")
      .then(({ notes }) => setRecent(notes.slice(0, 5)))
      .catch(() => {});
  }, [open]);

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const { note } = await fetchJSON<{ note: Note }>("/api/notes", {
        method: "POST",
        body: JSON.stringify({ title: title.trim() || "Untitled", body }),
      });
      setRecent((prev) => [note, ...prev].slice(0, 5));
      setTitle("");
      setBody("");
      toast.success("Note saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  if (!isActive) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Quick note"
        title="Quick note (N)"
        onClick={() => setOpen(true)}
      >
        <NotebookPen className="h-4 w-4" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4" /> Quick note
          </SheetTitle>
          <SheetDescription>
            Jot something down without leaving your session. Press{" "}
            <kbd className="rounded border border-border bg-muted px-1 text-[10px]">
              N
            </kbd>{" "}
            anytime a timer&apos;s running to reopen this.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2 px-4">
          <Input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            autoFocus
            placeholder="Write something…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-32 resize-y"
          />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving || !body.trim()} className="gap-2">
              <Save className="h-4 w-4" /> Save
            </Button>
            <Button
              variant="outline"
              disabled={!body.trim()}
              onClick={() => copyWithHistory(body, "note")}
              className="gap-2"
            >
              <Copy className="h-4 w-4" /> Copy
            </Button>
          </div>
        </div>

        {recent.length > 0 && (
          <>
            <Separator className="mx-4 w-auto" />
            <div className="space-y-2 overflow-y-auto px-4 pb-4">
              <p className="text-xs font-medium text-muted-foreground">Recent notes</p>
              {recent.map((note) => (
                <div
                  key={note.id}
                  className="flex items-start gap-2 rounded-md border border-border p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{note.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {note.body}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => copyWithHistory(note.body, "note")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </SheetContent>
      </Sheet>
    </>
  );
}
