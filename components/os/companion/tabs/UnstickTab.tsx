"use client";

import { useRef, useState } from "react";
import { fetchJSON } from "@/lib/fetch-json";
import { useTimerStore } from "@/lib/store/timer";
import { useOSStore } from "@/lib/store/os";
import { toast } from "sonner";
import { Timer, ListTodo, MessageCircleQuestion, Wind, Puzzle, RotateCcw } from "lucide-react";

const TEASERS = [
  "A boat has a ladder with 10 rungs, each 30cm apart. The tide rises 60cm an hour. After two hours, how many rungs are underwater?",
  "You have two ropes that each burn for exactly one hour, unevenly. Measure 45 minutes.",
  "What number, when you spell it out, has its letters in alphabetical order?",
];

const OPTIONS = [
  { id: "five", icon: Timer, title: "Just 5 minutes", desc: "Starts a timer. No commitment past that." },
  { id: "smallest", icon: ListTodo, title: "Smallest next step", desc: "I'll pick one thing off your list." },
  { id: "name", icon: MessageCircleQuestion, title: "Name what you're avoiding", desc: "Say it plainly. I won't argue with it." },
  { id: "breathe", icon: Wind, title: "Four rounds of breath", desc: "Ninety seconds, then start." },
  { id: "teaser", icon: Puzzle, title: "A warm-up puzzle", desc: "One minute of thinking that isn't the work." },
  { id: "double", icon: RotateCcw, title: "Check in every 20 min", desc: "One line from me, no reply needed." },
] as const;

export function UnstickTab({ stage }: { stage: { width: number; height: number } }) {
  const [text, setText] = useState<string | null>(null);
  const [breathing, setBreathing] = useState(false);
  const showWin = useOSStore((s) => s.show);
  const teaserIndex = useRef(0);

  async function run(kind: (typeof OPTIONS)[number]["id"]) {
    setBreathing(kind === "breathe");
    switch (kind) {
      case "five":
        useTimerStore.getState().start({ mode: "stopwatch", categoryId: null, taskId: null });
        showWin("timer", stage);
        setText("Five minutes on the clock. Stop when you're ready, guilt-free.");
        break;
      case "smallest": {
        setText("Thinking…");
        try {
          const res = await fetchJSON<{ suggestion: string; taskTitle: string | null }>(
            "/api/companion/unstick-smallest",
            { method: "POST" }
          );
          setText(res.suggestion);
        } catch {
          setText("Couldn't reach your tasks — try again in a moment.");
        }
        break;
      }
      case "name":
        setText("Type it here, plainly: what are you actually avoiding? I won't argue with the answer.");
        break;
      case "breathe":
        setText("In for four. Hold for seven. Out for eight. Four rounds.");
        break;
      case "teaser":
        teaserIndex.current = (teaserIndex.current + 1) % TEASERS.length;
        setText(TEASERS[teaserIndex.current]);
        break;
      case "double":
        setText("Check-ins on, every 20 minutes. One line from me, no reply needed.");
        toast("Check-ins on · every 20 min");
        break;
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
      <div className="text-[13px]" style={{ color: "var(--dim)" }}>
        Pick the smallest thing you can stand.
      </div>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map(({ id, icon: Icon, title, desc }) => (
          <button
            key={id}
            onClick={() => run(id)}
            className="flex flex-col gap-1.5 rounded-[13px] border p-[13px] text-left"
            style={{ borderColor: "var(--edge-soft)", background: "rgba(255,255,255,0.04)" }}
          >
            <Icon className="h-4 w-4" style={{ color: "var(--accent)" }} strokeWidth={1.9} />
            <span className="text-[13.5px]">{title}</span>
            <span className="text-[12px] leading-relaxed" style={{ color: "var(--dim)" }}>
              {desc}
            </span>
          </button>
        ))}
      </div>

      {text && (
        <div
          className="flex flex-col items-center gap-3 rounded-[13px] border p-[18px]"
          style={{ borderColor: "var(--edge)", background: "rgba(255,255,255,0.06)" }}
        >
          {breathing && (
            <div
              className="h-14 w-14 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, var(--accent), rgba(255,255,255,0.05))",
                animation: "breathe 9.5s ease-in-out infinite",
              }}
            />
          )}
          <div className="text-center text-[13.5px] leading-relaxed text-white/90">{text}</div>
        </div>
      )}
    </div>
  );
}
