"use client";

import { useEffect, useRef, useState } from "react";
import { OSWindow } from "@/components/os/Window";
import { CategorySelect } from "@/components/timer/category-select";
import { TaskSelect } from "@/components/timer/task-select";
import { useTimerStore, type TimerMode } from "@/lib/store/timer";
import { formatDuration } from "@/lib/format-duration";
import { fetchJSON } from "@/lib/fetch-json";
import { playChime } from "@/lib/sound";
import { Timer as TimerIcon, Play, Square } from "lucide-react";
import { toast } from "sonner";

const PHASE_LABEL: Record<string, string> = {
  work: "Focus",
  short_break: "Short break",
  long_break: "Long break",
};

export function TimerWindow({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const store = useTimerStore();
  const {
    status,
    mode,
    categoryId,
    taskId,
    pomodoroPhase,
    sessionStartedAt,
    advancePomodoroPhase,
    currentPhaseDurationSeconds,
  } = store;

  const [, forceTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const advancedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = store.elapsedSeconds();
  const phaseDuration = mode === "pomodoro" ? currentPhaseDurationSeconds() : null;
  const remaining = phaseDuration !== null ? phaseDuration - elapsed : null;

  useEffect(() => {
    if (mode !== "pomodoro" || status !== "running" || remaining === null) return;
    if (remaining <= 0 && !advancedRef.current) {
      advancedRef.current = true;
      const next = advancePomodoroPhase();
      playChime();
      toast(next === "work" ? "Back to work" : "Time for a break", {
        description: PHASE_LABEL[next],
      });
    } else if (remaining > 0) {
      advancedRef.current = false;
    }
  }, [remaining, mode, status, advancePomodoroPhase]);

  async function handleComplete() {
    if (!sessionStartedAt) return;
    setBusy(true);
    try {
      await fetchJSON("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          categoryId,
          taskId,
          mode,
          startedAt: new Date(sessionStartedAt).toISOString(),
          endedAt: new Date().toISOString(),
          durationSeconds: elapsed,
          status: "completed",
        }),
      });
      toast.success(`Logged ${formatDuration(elapsed, true)} to the Freedom Goal`);
      store.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save session");
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    if (elapsed > 30 && !window.confirm("Discard this session? Elapsed time won't be saved.")) {
      return;
    }
    store.reset();
  }

  const isIdle = status === "idle";
  const isRunning = status === "running";

  return (
    <OSWindow id="timer" icon={<TimerIcon className="h-[13px] w-[13px]" strokeWidth={1.9} />} stageRef={stageRef}>
      <div className="flex flex-col items-center gap-3.5 p-4">
        {isIdle ? (
          <div
            className="inline-flex items-center rounded-[10px] border p-[3px]"
            style={{ background: "rgba(255,255,255,0.07)", borderColor: "var(--edge-soft)" }}
          >
            {(["stopwatch", "pomodoro"] as TimerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => useTimerStore.setState({ mode: m })}
                className="rounded-[7px] px-3 py-1 text-[12.5px] capitalize"
                style={{
                  background: mode === m ? "rgba(255,255,255,0.14)" : "transparent",
                  color: mode === m ? "rgba(255,255,255,0.95)" : "var(--dim)",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        ) : (
          mode === "pomodoro" && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px]"
              style={{
                background: pomodoroPhase === "work" ? "var(--accent)" : "rgba(255,255,255,0.1)",
                color: pomodoroPhase === "work" ? "#111214" : "rgba(255,255,255,0.85)",
              }}
            >
              {PHASE_LABEL[pomodoroPhase]}
            </span>
          )
        )}

        <div className="font-mono text-[52px] font-light leading-none tracking-[-0.03em] tabular-nums">
          {mode === "pomodoro" && remaining !== null
            ? formatDuration(remaining, true)
            : formatDuration(elapsed, true)}
        </div>

        <div className="flex w-full flex-wrap justify-center gap-1.5">
          <CategorySelect
            value={categoryId}
            onChange={(id) => useTimerStore.setState({ categoryId: id })}
            disabled={!isIdle}
          />
          <TaskSelect
            value={taskId}
            onChange={(id) => useTimerStore.setState({ taskId: id })}
            disabled={!isIdle}
          />
        </div>

        <div className="flex items-center gap-1.5">
          {isIdle && (
            <button
              onClick={() => store.start({ mode, categoryId, taskId })}
              className="flex h-[34px] items-center gap-[7px] rounded-[10px] bg-white/92 px-4 text-[13.5px] font-medium text-[#111214] hover:bg-white"
            >
              <Play className="h-3.5 w-3.5" />
              Start
            </button>
          )}
          {!isIdle && (
            <>
              <button
                onClick={isRunning ? store.pause : store.resume}
                className="flex h-[34px] items-center gap-[7px] rounded-[10px] border px-4 text-[13.5px]"
                style={{ borderColor: "var(--edge)", background: "rgba(255,255,255,0.06)" }}
              >
                {isRunning ? "Pause" : "Resume"}
              </button>
              <button
                onClick={handleComplete}
                disabled={busy || elapsed < 1}
                className="flex h-[34px] items-center gap-[7px] rounded-[10px] border px-3 text-[13.5px] disabled:opacity-50"
                style={{ borderColor: "var(--edge)", background: "rgba(255,255,255,0.06)" }}
              >
                <Square className="h-[13px] w-[13px]" />
                Complete
              </button>
              <button
                onClick={handleCancel}
                className="h-[34px] rounded-[10px] px-3 text-[13.5px]"
                style={{ color: "var(--dim)" }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </OSWindow>
  );
}
