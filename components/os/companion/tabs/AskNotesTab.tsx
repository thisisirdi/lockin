"use client";

import { useState } from "react";
import { fetchJSON } from "@/lib/fetch-json";
import { toast } from "sonner";
import { FileSearch, Loader2 } from "lucide-react";

export function AskNotesTab() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetchJSON<{ answer: string; sources: string[] }>(
        "/api/companion/ask-notes",
        { method: "POST", body: JSON.stringify({ question }) }
      );
      setAnswer(res.answer);
      setSources(res.sources);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't search your notes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4">
      <div
        className="flex items-center gap-2 rounded-[11px] border px-3 py-[9px]"
        style={{ borderColor: "var(--edge)", background: "rgba(255,255,255,0.05)" }}
      >
        <FileSearch className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--dim)" }} />
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="What did I decide about…?"
          className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-white/35"
        />
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--dim)" }} />}
      </div>

      {answer && (
        <div className="flex flex-col gap-2.5 text-[13.5px] leading-relaxed">
          <p className="m-0">{answer}</p>
          {sources.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span
                className="text-[11.5px] uppercase tracking-[0.05em]"
                style={{ color: "var(--dim2)" }}
              >
                From {sources.length} note{sources.length === 1 ? "" : "s"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {sources.map((s) => (
                  <span
                    key={s}
                    className="rounded-[8px] border px-2.5 py-1 text-[12px]"
                    style={{ borderColor: "var(--edge-soft)", background: "rgba(255,255,255,0.05)" }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
