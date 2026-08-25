import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PomodoroSettings } from "@/lib/types";

export type TimerMode = "stopwatch" | "pomodoro";
export type TimerStatus = "idle" | "running" | "paused";
export type PomodoroPhase = "work" | "short_break" | "long_break";

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  work_minutes: 25,
  short_break_minutes: 5,
  long_break_minutes: 15,
  cycles_before_long_break: 4,
};

interface TimerState {
  status: TimerStatus;
  mode: TimerMode;
  categoryId: string | null;
  taskId: string | null;
  /** Epoch ms the current running segment began. Null while paused/idle. */
  startedAt: number | null;
  /** Seconds banked from prior running segments (before the current one). */
  accumulatedSeconds: number;
  /** Epoch ms of the very first start of this session (for the DB record). */
  sessionStartedAt: number | null;
  pomodoroPhase: PomodoroPhase;
  pomodoroCyclesCompleted: number;
  pomodoroSettings: PomodoroSettings;

  start: (opts: {
    mode: TimerMode;
    categoryId: string | null;
    taskId?: string | null;
  }) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setPomodoroSettings: (settings: PomodoroSettings) => void;
  /** Advances to the next pomodoro phase once the current one's duration elapses. */
  advancePomodoroPhase: () => PomodoroPhase;
  elapsedSeconds: () => number;
  currentPhaseDurationSeconds: () => number;
}

const initialFields = {
  status: "idle" as TimerStatus,
  mode: "stopwatch" as TimerMode,
  categoryId: null as string | null,
  taskId: null as string | null,
  startedAt: null as number | null,
  accumulatedSeconds: 0,
  sessionStartedAt: null as number | null,
  pomodoroPhase: "work" as PomodoroPhase,
  pomodoroCyclesCompleted: 0,
};

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      ...initialFields,
      pomodoroSettings: DEFAULT_POMODORO_SETTINGS,

      start: ({ mode, categoryId, taskId = null }) => {
        const now = Date.now();
        set({
          status: "running",
          mode,
          categoryId,
          taskId,
          startedAt: now,
          sessionStartedAt: now,
          accumulatedSeconds: 0,
          pomodoroPhase: "work",
          pomodoroCyclesCompleted: 0,
        });
      },

      pause: () => {
        const { status, startedAt, accumulatedSeconds } = get();
        if (status !== "running" || startedAt === null) return;
        set({
          status: "paused",
          accumulatedSeconds:
            accumulatedSeconds + (Date.now() - startedAt) / 1000,
          startedAt: null,
        });
      },

      resume: () => {
        if (get().status !== "paused") return;
        set({ status: "running", startedAt: Date.now() });
      },

      reset: () => set({ ...initialFields }),

      setPomodoroSettings: (settings) => set({ pomodoroSettings: settings }),

      elapsedSeconds: () => {
        const { status, startedAt, accumulatedSeconds } = get();
        if (status === "running" && startedAt !== null) {
          return accumulatedSeconds + (Date.now() - startedAt) / 1000;
        }
        return accumulatedSeconds;
      },

      currentPhaseDurationSeconds: () => {
        const { pomodoroPhase, pomodoroSettings } = get();
        const minutes =
          pomodoroPhase === "work"
            ? pomodoroSettings.work_minutes
            : pomodoroPhase === "short_break"
              ? pomodoroSettings.short_break_minutes
              : pomodoroSettings.long_break_minutes;
        return minutes * 60;
      },

      advancePomodoroPhase: () => {
        const { pomodoroPhase, pomodoroCyclesCompleted, pomodoroSettings } =
          get();
        let nextPhase: PomodoroPhase;
        let nextCycles = pomodoroCyclesCompleted;

        if (pomodoroPhase === "work") {
          nextCycles += 1;
          nextPhase =
            nextCycles % pomodoroSettings.cycles_before_long_break === 0
              ? "long_break"
              : "short_break";
        } else {
          nextPhase = "work";
        }

        set({
          pomodoroPhase: nextPhase,
          pomodoroCyclesCompleted: nextCycles,
          accumulatedSeconds: 0,
          startedAt: Date.now(),
        });

        return nextPhase;
      },
    }),
    {
      name: "lockin-timer",
      partialize: (state) => ({
        status: state.status,
        mode: state.mode,
        categoryId: state.categoryId,
        taskId: state.taskId,
        startedAt: state.startedAt,
        accumulatedSeconds: state.accumulatedSeconds,
        sessionStartedAt: state.sessionStartedAt,
        pomodoroPhase: state.pomodoroPhase,
        pomodoroCyclesCompleted: state.pomodoroCyclesCompleted,
        pomodoroSettings: state.pomodoroSettings,
      }),
    }
  )
);
