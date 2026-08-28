"use client";

import { useState } from "react";
import { fetchJSON } from "@/lib/fetch-json";
import { usePrompts } from "@/lib/hooks/use-prompts";
import { copyWithHistory } from "@/lib/copy";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

export function RefineTab() {
  const [rawInput, setRawInput] = useState("");
  const [refined, setRefined] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { createPrompt } = usePrompts("", null, false);

  async function refine() {
    if (!rawInput.trim()) return;
    setLoading(true);
    setRefined(null);
    try {
      const { refined } = await fetchJSON<{ refined: string }>("/api/refine-prompt", {
        method: "POST",
        body: JSON.stringify({ rawInput }),
      });
      setRefined(refined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refinement failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11.5px] uppercase tracking-[0.05em]" style={{ color: "var(--dim2)" }}>
            Rough
          </span>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Paste a rough prompt idea…"
            className="min-h-[150px] resize-none rounded-[11px] border bg-transparent p-[11px] text-[13px] leading-relaxed outline-none placeholder:text-white/35"
            style={{ borderColor: "var(--edge)", background: "rgba(255,255,255,0.04)" }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11.5px] uppercase tracking-[0.05em]" style={{ color: "var(--dim2)" }}>
            Refined
          </span>
          <div
            className="min-h-[150px] whitespace-pre-wrap rounded-[11px] border p-[11px] text-[13px] leading-relaxed"
            style={{ borderColor: "var(--edge)", background: "rgba(255,255,255,0.07)" }}
          >
            {loading ? (
              <span style={{ color: "var(--dim)" }}>Refining…</span>
            ) : (
              refined ?? <span style={{ color: "var(--dim)" }}>—</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={refine}
          disabled={loading || !rawInput.trim()}
          className="flex items-center gap-[7px] rounded-[9px] bg-white/92 px-3 py-2 text-[13px] font-medium text-[#111214] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Refine
        </button>
        {refined && (
          <>
            <button
              onClick={() => copyWithHistory(refined, "prompt")}
              className="rounded-[9px] border px-3 py-2 text-[13px]"
              style={{ borderColor: "var(--edge)", color: "rgba(255,255,255,0.85)" }}
            >
              Copy
            </button>
            <button
              onClick={async () => {
                await createPrompt("Refined prompt", refined, ["refined"]);
                toast.success("Saved to Prompt Library");
              }}
              className="rounded-[9px] border px-3 py-2 text-[13px]"
              style={{ borderColor: "var(--edge)", color: "rgba(255,255,255,0.85)" }}
            >
              Save to library
            </button>
          </>
        )}
      </div>
    </div>
  );
}
