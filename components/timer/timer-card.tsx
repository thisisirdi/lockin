"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CategorySelect } from "@/components/timer/category-select";
import { PomodoroSettingsDialog } from "@/components/timer/pomodoro-settings-dialog";
import { useTimerStore, type TimerMode } from "@/lib/store/timer";
import { formatDuration } from "@/lib/format-duration";
import { fetchJSON } from "@/lib/fetch-json";
import { playChime } from "@/lib/sound";
import { Play, Pause, Square, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PHASE_LABEL: Record<string, string> = {
  work: "Focus",
  short_break: "Short break",
  long_break: "Long break",
};

export function TimerCard({ onSessionSaved }: { onSessionSaved?: () => void }) {
  const store = useTimerStore();
  const {
    status,
    mode,
    categoryId,
    pomodoroPhase,
    sessionStartedAt,
    advancePomodoroPhase,
    currentPhaseDurationSeconds,
  } = store;

  const [, forceTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const advancedRef = useRef(false);

  // Re-render every second. The source of truth is the started_at
  // timestamp in the store, not this interval — so a refresh never loses
  // elapsed time.
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

  async function handleStart(nextMode: TimerMode) {
    store.start({ mode: nextMode, categoryId });
  }

  async function handleComplete() {
    if (!sessionStartedAt) return;
    setBusy(true);
    try {
      await fetchJSON("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          categoryId,
          mode,
          startedAt: new Date(sessionStartedAt).toISOString(),
          endedAt: new Date().toISOString(),
          durationSeconds: elapsed,
          status: "completed",
        }),
      });
      toast.success(`Logged ${formatDuration(elapsed, true)}`);
      store.reset();
      onSessionSaved?.();
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
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col items-center gap-6 py-10">
        {isIdle ? (
          <Tabs
            value={mode}
            onValueChange={(v) => useTimerStore.setState({ mode: v as TimerMode })}
          >
            <TabsList>
              <TabsTrigger value="stopwatch">Stopwatch</TabsTrigger>
              <TabsTrigger value="pomodoro">Pomodoro</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          mode === "pomodoro" && (
            <Badge
              variant={pomodoroPhase === "work" ? "default" : "secondary"}
              className="text-xs"
            >
              {PHASE_LABEL[pomodoroPhase]}
            </Badge>
          )
        )}

        <div
          className={cn(
            "font-mono text-7xl font-semibold tabular-nums tracking-tight",
            status === "paused" && "text-muted-foreground"
          )}
        >
          {mode === "pomodoro" && remaining !== null
            ? formatDuration(remaining, true)
            : formatDuration(elapsed, true)}
        </div>

        <div className="flex items-center gap-3">
          <CategorySelect
            value={categoryId}
            onChange={(id) => useTimerStore.setState({ categoryId: id })}
            disabled={!isIdle}
          />
          {mode === "pomodoro" && isIdle && <PomodoroSettingsDialog />}
        </div>

        <div className="flex items-center gap-2">
          {isIdle && (
            <Button size="lg" onClick={() => handleStart(mode)} className="gap-2">
              <Play className="h-4 w-4" /> Start
            </Button>
          )}

          {!isIdle && (
            <>
              {isRunning ? (
                <Button size="lg" variant="outline" onClick={store.pause} className="gap-2">
                  <Pause className="h-4 w-4" /> Pause
                </Button>
              ) : (
                <Button size="lg" onClick={store.resume} className="gap-2">
                  <Play className="h-4 w-4" /> Resume
                </Button>
              )}
              <Button
                size="lg"
                variant="secondary"
                onClick={handleComplete}
                disabled={busy || elapsed < 1}
                className="gap-2"
              >
                <Square className="h-4 w-4" /> Complete
              </Button>
              <Button size="lg" variant="ghost" onClick={handleCancel} className="gap-2">
                <X className="h-4 w-4" /> Cancel
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
