"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Trash2 } from "lucide-react";
import type { Note } from "@/lib/types";
import { copyWithHistory } from "@/lib/copy";

export function NoteCard({
  note,
  onSave,
  onDelete,
}: {
  note: Note;
  onSave: (patch: Partial<Note>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [tagInput, setTagInput] = useState(note.tags.join(", "));

  function commit() {
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSave({ title, body, tags });
  }

  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <div className="flex items-start gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            className="border-none px-0 text-base font-medium shadow-none focus-visible:ring-0"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => copyWithHistory(body, "note")}
            aria-label="Copy note"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete note">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={commit}
          placeholder="Write something…"
          className="min-h-24 resize-y"
        />
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onBlur={commit}
          placeholder="tags, comma, separated"
          className="h-7 text-xs"
        />
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {note.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
