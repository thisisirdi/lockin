"use client";

import { useState } from "react";
import { fetchJSON } from "@/lib/fetch-json";
import { useTasks } from "@/lib/hooks/use-tasks";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

export function BreakdownTab() {
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { addTask } = useTasks();

  async function breakdown() {
    if (!title.trim()) return;
    setLoading(true);
    setSteps(null);
    try {
      const { steps } = await fetchJSON<{ steps: string[] }>("/api/companion/breakdown", {
        method: "POST",
        body: JSON.stringify({ title: title.trim() }),
      });
      setSteps(steps);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't break that down");
    } finally {
      setLoading(false);
    }
  }

  async function addAll() {
    if (!steps) return;
    await Promise.all(steps.map((s) => addTask(s, "Step")));
    toast.success(`Added ${steps.length} to Tasks`);
  }

  return (
    <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] uppercase tracking-[0.05em]" style={{ color: "var(--dim2)" }}>
          The vague thing
        </span>
        <div className="flex gap-1.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && breakdown()}
            placeholder="e.g. Ship the window manager"
            className="h-9 flex-1 rounded-[11px] border bg-transparent px-3 text-[13.5px] outline-none placeholder:text-white/35"
            style={{ borderColor: "var(--edge)" }}
          />
          <button
            onClick={breakdown}
            disabled={loading || !title.trim()}
            className="flex items-center gap-1.5 rounded-[11px] bg-white/92 px-3 text-[13px] font-medium text-[#111214] disabled:opacity-50"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Break it down
          </button>
        </div>
      </div>

      {steps && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] uppercase tracking-[0.05em]" style={{ color: "var(--dim2)" }}>
            Smallest first steps
          </span>
          <div className="flex flex-col gap-1.5">
            {steps.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-[11px] border p-2.5"
                style={{
                  borderColor: i === 0 ? "var(--accent)" : "var(--edge-soft)",
                  background: i === 0 ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
                }}
              >
                <span
                  className="mt-0.5 h-[15px] w-[15px] shrink-0 rounded-[5px] border"
                  style={{ borderColor: i === 0 ? "var(--edge-hi)" : "var(--edge)" }}
                />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[13.5px]">{s}</span>
                  {i === 0 && (
                    <span className="text-[11.5px]" style={{ color: "var(--accent)" }}>
                      start here
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addAll}
            className="flex w-fit items-center gap-[7px] self-start rounded-[9px] bg-white/92 px-3 py-1.5 text-[13px] font-medium text-[#111214]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add all {steps.length} to Tasks
          </button>
        </div>
      )}
    </div>
  );
}
