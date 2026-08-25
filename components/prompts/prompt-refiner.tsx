"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { fetchJSON } from "@/lib/fetch-json";
import { copyWithHistory } from "@/lib/copy";
import { Sparkles, Copy, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PromptRefiner({
  onSaveToLibrary,
}: {
  onSaveToLibrary: (body: string) => Promise<void>;
}) {
  const [rawInput, setRawInput] = useState("");
  const [refined, setRefined] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function refine() {
    if (!rawInput.trim()) return;
    setLoading(true);
    setRefined(null);
    try {
      const { refined } = await fetchJSON<{ refined: string }>(
        "/api/refine-prompt",
        { method: "POST", body: JSON.stringify({ rawInput }) }
      );
      setRefined(refined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refinement failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" /> Prompt refiner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Rough input</p>
            <Textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Paste a rough prompt idea…"
              className="min-h-32 resize-y"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Refined</p>
            <div className="min-h-32 rounded-md border border-input bg-muted/30 p-3 text-sm whitespace-pre-wrap">
              {loading ? (
                <span className="text-muted-foreground">Refining…</span>
              ) : (
                refined ?? <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={refine} disabled={loading || !rawInput.trim()} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Refine
          </Button>
          {refined && (
            <>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => copyWithHistory(refined, "prompt")}
              >
                <Copy className="h-4 w-4" /> Copy
              </Button>
              <Button
                variant="secondary"
                className="gap-2"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  await onSaveToLibrary(refined);
                  setSaving(false);
                  toast.success("Saved to Prompt Library");
                }}
              >
                <Save className="h-4 w-4" /> Save to library
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
