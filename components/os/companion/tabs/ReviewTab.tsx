"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/fetch-json";
import { toast } from "sonner";

interface ReviewStats {
  totalHours: number;
  sessionCount: number;
  medianBlockMinutes: number;
  morningSessions: number;
  afternoonSessions: number;
}

export function ReviewTab() {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    fetchJSON<{ stats: ReviewStats; insight: string | null }>("/api/companion/review")
      .then(({ stats, insight }) => {
        setStats(stats);
        setInsight(insight);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Couldn't load your review");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-[13px]" style={{ color: "var(--dim)" }}>
        {loading ? "Reading last 7 days…" : "Couldn't load your review."}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div className="grid grid-cols-3 gap-2">
        <StatTile value={`${stats!.totalHours}h`} label="logged" />
        <StatTile value={String(stats!.sessionCount)} label="sessions" />
        <StatTile value={`${stats!.medianBlockMinutes}m`} label="median block" />
      </div>

      <div className="flex flex-col gap-2 text-[13.5px] leading-relaxed">
        {insight ? (
          <p className="m-0">{insight}</p>
        ) : (
          <p className="m-0" style={{ color: "var(--dim)" }}>
            {stats!.sessionCount === 0
              ? "Nothing logged in the last 7 days."
              : `${stats!.morningSessions} morning session${stats!.morningSessions === 1 ? "" : "s"}, ${stats!.afternoonSessions} afternoon.`}
          </p>
        )}
      </div>

      {insight && (
        <button
          onClick={async () => {
            await fetchJSON("/api/notes", {
              method: "POST",
              body: JSON.stringify({
                title: `Weekly review · ${new Date().toLocaleDateString()}`,
                body: insight,
                tags: ["review"],
              }),
            });
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            toast.success("Saved to Notes");
          }}
          className="w-fit rounded-[9px] border px-[11px] py-1.5 text-[12.5px]"
          style={{ borderColor: "var(--edge)", color: "rgba(255,255,255,0.85)" }}
        >
          Save as a note
        </button>
      )}
    </div>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="flex flex-col gap-[3px] rounded-[12px] border p-3"
      style={{ borderColor: "var(--edge-soft)", background: "rgba(255,255,255,0.05)" }}
    >
      <span className="font-mono text-[20px] font-light">{value}</span>
      <span className="text-[11.5px]" style={{ color: "var(--dim)" }}>
        {label}
      </span>
    </div>
  );
}
