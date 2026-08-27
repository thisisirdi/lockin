"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJSON } from "@/lib/fetch-json";
import { useTimerStore } from "@/lib/store/timer";
import { useOSStore } from "@/lib/store/os";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";

interface PlanBlock {
  time: string;
  title: string;
  minutes: number;
  note: string;
  startable: boolean;
}

export function PlanTab({ stage }: { stage: { width: number; height: number } }) {
  const [blocks, setBlocks] = useState<PlanBlock[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const showWin = useOSStore((s) => s.show);

  const load = useCallback(async () => {
    try {
      const res = await fetchJSON<{ blocks: PlanBlock[]; message?: string }>(
        "/api/companion/plan",
        { method: "POST" }
      );
      setBlocks(res.blocks);
      setMessage(res.message ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't build a plan");
    } finally {
      setLoading(false);
    }
  }, []);

  function redraw() {
    setLoading(true);
    load();
  }

  useEffect(() => {
    // load() only touches state after its internal `await` resolves, never
    // synchronously — safe despite the lint rule's static analysis flagging it
    // (likely because `load` is also invoked, behind its own setState, from redraw()).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function startBlock(title: string) {
    useTimerStore.getState().start({ mode: "stopwatch", categoryId: null, taskId: null });
    showWin("timer", stage);
    toast.success(`Started: ${title}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4">
      <div className="flex items-center justify-between gap-2.5">
        <div className="text-[13px]" style={{ color: "var(--dim)" }}>
          From your open tasks and goal pace
        </div>
        <button
          onClick={redraw}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-[8px] border px-2.5 py-[5px] text-[12px]"
          style={{ borderColor: "var(--edge)", background: "rgba(255,255,255,0.05)" }}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Redraw
        </button>
      </div>

      {message && (
        <p className="text-[13px]" style={{ color: "var(--dim)" }}>
          {message}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {blocks?.map((b, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-[13px] border p-3"
            style={{ borderColor: "var(--edge-soft)", background: "rgba(255,255,255,0.05)" }}
          >
            <span className="pt-px font-mono text-[12.5px]" style={{ color: "var(--accent)" }}>
              {b.time}
            </span>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[13.5px]">{b.title}</span>
              <span className="text-[12px]" style={{ color: "var(--dim)" }}>
                {b.minutes} min{b.note ? ` · ${b.note}` : ""}
              </span>
            </div>
            {b.startable && (
              <button
                onClick={() => startBlock(b.title)}
                className="h-fit self-center rounded-[8px] border px-[9px] py-1 text-[11.5px]"
                style={{ borderColor: "var(--edge)", color: "rgba(255,255,255,0.8)" }}
              >
                Start
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
