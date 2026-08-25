"use client";

import { useState } from "react";
import { usePrompts } from "@/lib/hooks/use-prompts";
import { PromptRefiner } from "@/components/prompts/prompt-refiner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Trash2, Plus } from "lucide-react";
import { copyWithHistory } from "@/lib/copy";

export default function PromptsPage() {
  const { prompts, createPrompt, deletePrompt, trackUsage } = usePrompts();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [adding, setAdding] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-semibold">Prompts</h1>

      <PromptRefiner
        onSaveToLibrary={async (refinedBody) => {
          await createPrompt("Refined prompt", refinedBody, ["refined"]);
        }}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Library</h2>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setAdding((a) => !a)}>
            <Plus className="h-4 w-4" /> New prompt
          </Button>
        </div>

        {adding && (
          <Card>
            <CardContent className="space-y-2 pt-6">
              <Input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Prompt body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-24"
              />
              <Input
                placeholder="tags, comma, separated"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <Button
                onClick={async () => {
                  if (!title.trim() || !body.trim()) return;
                  await createPrompt(
                    title.trim(),
                    body.trim(),
                    tags.split(",").map((t) => t.trim()).filter(Boolean)
                  );
                  setTitle("");
                  setBody("");
                  setTags("");
                  setAdding(false);
                }}
              >
                Save prompt
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardContent className="space-y-2 pt-6">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{prompt.title}</p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        copyWithHistory(prompt.body, "prompt");
                        trackUsage(prompt.id);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePrompt(prompt.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {prompt.body}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {prompt.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {prompt.usage_count > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      used {prompt.usage_count}×
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {prompts.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No saved prompts yet.
          </p>
        )}
      </div>
    </div>
  );
}
