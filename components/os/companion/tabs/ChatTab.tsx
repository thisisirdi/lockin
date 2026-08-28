"use client";

import { useEffect, useRef, useState } from "react";
import { useCompanionStore, type PlanBlockData } from "@/lib/store/companion";
import { fetchJSON } from "@/lib/fetch-json";
import { fetchAttachOptions, type AttachOption } from "@/lib/companion/attach-options";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useTimerStore } from "@/lib/store/timer";
import { useOSStore } from "@/lib/store/os";
import { toast } from "sonner";
import {
  AtSign,
  Paperclip,
  ArrowUp,
  X,
  CalendarClock,
  ListTree,
  NotebookPen,
  Puzzle,
  Timer,
  ListTodo,
  MessageCircleQuestion,
  Wind,
  RotateCcw,
} from "lucide-react";

type PendingAction = "breakdown" | "ask-notes" | null;

const UNSTICK_TEASERS = [
  "A boat has a ladder with 10 rungs, each 30cm apart. The tide rises 60cm an hour. After two hours, how many rungs are underwater?",
  "You have two ropes that each burn for exactly one hour, unevenly. Measure 45 minutes.",
  "What number, when you spell it out, has its letters in alphabetical order?",
];

const UNSTICK_OPTIONS = [
  { id: "five", icon: Timer, title: "Just 5 minutes", desc: "Starts a timer. No commitment past that." },
  { id: "smallest", icon: ListTodo, title: "Smallest next step", desc: "I'll pick one thing off your list." },
  { id: "name", icon: MessageCircleQuestion, title: "Name what you're avoiding", desc: "Say it plainly. I won't argue with it." },
  { id: "breathe", icon: Wind, title: "Four rounds of breath", desc: "Ninety seconds, then start." },
  { id: "teaser", icon: Puzzle, title: "A warm-up puzzle", desc: "One minute of thinking that isn't the work." },
  { id: "double", icon: RotateCcw, title: "Check in every 20 min", desc: "One line from me, no reply needed." },
] as const;

export function ChatTab({ stage }: { stage: { width: number; height: number } }) {
  const messages = useCompanionStore((s) => s.messages);
  const chips = useCompanionStore((s) => s.chips);
  const addMessage = useCompanionStore((s) => s.addMessage);
  const addChip = useCompanionStore((s) => s.addChip);
  const removeChip = useCompanionStore((s) => s.removeChip);
  const { addTask } = useTasks(false);
  const showWin = useOSStore((s) => s.show);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachOptions, setAttachOptions] = useState<AttachOption[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [unstickOpen, setUnstickOpen] = useState(false);
  const [unstickText, setUnstickText] = useState<string | null>(null);
  const [unstickBreathing, setUnstickBreathing] = useState(false);
  const teaserIndex = useRef(0);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages]);

  async function openAttach() {
    setAttachOpen((v) => !v);
    if (attachOptions.length === 0) setAttachOptions(await fetchAttachOptions());
  }

  async function handlePlan() {
    setSending(true);
    addMessage({ role: "user", content: "Plan my day" });
    try {
      const res = await fetchJSON<{ blocks: PlanBlockData[]; message?: string }>("/api/companion/action", {
        method: "POST",
        body: JSON.stringify({ action: "plan" }),
      });
      addMessage({ role: "assistant", content: res.message ?? "Here's a plan for today:", plan: res });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't build a plan");
    } finally {
      setSending(false);
    }
  }

  function startBreakdown() {
    setPendingAction("breakdown");
    setUnstickOpen(false);
  }

  function startAskNotes() {
    setPendingAction("ask-notes");
    setUnstickOpen(false);
  }

  async function runUnstick(kind: (typeof UNSTICK_OPTIONS)[number]["id"]) {
    setUnstickBreathing(kind === "breathe");
    switch (kind) {
      case "five":
        useTimerStore.getState().start({ mode: "stopwatch", categoryId: null, taskId: null });
        showWin("timer", stage);
        setUnstickText("Five minutes on the clock. Stop when you're ready, guilt-free.");
        break;
      case "smallest": {
        setUnstickText("Thinking…");
        try {
          const res = await fetchJSON<{ suggestion: string; taskTitle: string | null }>("/api/companion/action", {
            method: "POST",
            body: JSON.stringify({ action: "unstick-smallest" }),
          });
          setUnstickText(res.suggestion);
        } catch {
          setUnstickText("Couldn't reach your tasks — try again in a moment.");
        }
        break;
      }
      case "name":
        setUnstickText("Type it here, plainly: what are you actually avoiding? I won't argue with the answer.");
        break;
      case "breathe":
        setUnstickText("In for four. Hold for seven. Out for eight. Four rounds.");
        break;
      case "teaser":
        teaserIndex.current = (teaserIndex.current + 1) % UNSTICK_TEASERS.length;
        setUnstickText(UNSTICK_TEASERS[teaserIndex.current]);
        break;
      case "double":
        setUnstickText("Check-ins on, every 20 minutes. One line from me, no reply needed.");
        toast("Check-ins on · every 20 min");
        break;
    }
  }

  async function addAllBreakdownSteps(steps: string[]) {
    await Promise.all(steps.map((s) => addTask(s, "Step")));
    toast.success(`Added ${steps.length} to Tasks`);
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    if (pendingAction === "breakdown") {
      addMessage({ role: "user", content: text });
      setPendingAction(null);
      try {
        const { steps } = await fetchJSON<{ steps: string[] }>("/api/companion/action", {
          method: "POST",
          body: JSON.stringify({ action: "breakdown", title: text }),
        });
        addMessage({ role: "assistant", content: "Smallest first steps:", breakdown: { steps } });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't break that down");
      } finally {
        setSending(false);
      }
      return;
    }

    if (pendingAction === "ask-notes") {
      addMessage({ role: "user", content: text });
      setPendingAction(null);
      try {
        const res = await fetchJSON<{ answer: string; sources: string[] }>("/api/companion/ask-notes", {
          method: "POST",
          body: JSON.stringify({ question: text }),
        });
        addMessage({ role: "assistant", content: res.answer, sources: res.sources });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't search your notes");
      } finally {
        setSending(false);
      }
      return;
    }

    addMessage({ role: "user", content: text });
    try {
      const { reply } = await fetchJSON<{ reply: string }>("/api/companion/chat", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10),
          context: chips.map((c) => c.text),
        }),
      });
      addMessage({ role: "assistant", content: reply });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Companion is unavailable");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div ref={threadRef} className="flex flex-1 min-h-0 flex-col gap-3.5 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex max-w-[92%] flex-col gap-1.5 ${m.role === "user" ? "self-end items-end" : ""}`}
          >
            <span className="text-[11px] uppercase tracking-[0.05em]" style={{ color: "var(--dim2)" }}>
              {m.role === "user" ? "You" : "Companion"}
            </span>

            {m.plan ? (
              <div className="flex flex-col gap-2">
                {m.plan.blocks.length === 0 ? (
                  <p className="text-[13px]" style={{ color: "var(--dim)" }}>
                    {m.content}
                  </p>
                ) : (
                  m.plan.blocks.map((b, bi) => (
                    <div
                      key={bi}
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
                          onClick={() => {
                            useTimerStore.getState().start({ mode: "stopwatch", categoryId: null, taskId: null });
                            showWin("timer", stage);
                            toast.success(`Started: ${b.title}`);
                          }}
                          className="h-fit self-center rounded-[8px] border px-[9px] py-1 text-[11.5px]"
                          style={{ borderColor: "var(--edge)", color: "rgba(255,255,255,0.8)" }}
                        >
                          Start
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : m.breakdown ? (
              <div className="flex flex-col gap-1.5">
                {m.breakdown.steps.map((s, si) => (
                  <div
                    key={si}
                    className="flex items-start gap-2.5 rounded-[11px] border p-2.5"
                    style={{
                      borderColor: si === 0 ? "var(--accent)" : "var(--edge-soft)",
                      background: si === 0 ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
                    }}
                  >
                    <span
                      className="mt-0.5 h-[15px] w-[15px] shrink-0 rounded-[5px] border"
                      style={{ borderColor: si === 0 ? "var(--edge-hi)" : "var(--edge)" }}
                    />
                    <span className="text-[13.5px]">{s}</span>
                  </div>
                ))}
                <button
                  onClick={() => addAllBreakdownSteps(m.breakdown!.steps)}
                  className="flex w-fit items-center gap-[7px] self-start rounded-[9px] bg-white/92 px-3 py-1.5 text-[13px] font-medium text-[#111214]"
                >
                  Add all {m.breakdown.steps.length} to Tasks
                </button>
              </div>
            ) : (
              <div
                className="whitespace-pre-wrap px-3 py-2.5 text-[13.5px] leading-relaxed"
                style={{
                  borderRadius: m.role === "user" ? "13px 13px 4px 13px" : "13px 13px 13px 4px",
                  background: m.role === "user" ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)",
                  border: m.role === "user" ? undefined : "1px solid var(--edge-soft)",
                }}
              >
                {m.content}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-1.5 text-[11px]" style={{ color: "var(--dim2)" }}>
                    Sources: {m.sources.join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex max-w-[88%] flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.05em]" style={{ color: "var(--dim2)" }}>
              Companion
            </span>
            <div
              className="px-3 py-2.5 text-[13.5px]"
              style={{
                borderRadius: "13px 13px 13px 4px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid var(--edge-soft)",
                color: "var(--dim)",
              }}
            >
              …
            </div>
          </div>
        )}

        {unstickOpen && (
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2">
              {UNSTICK_OPTIONS.map(({ id, icon: Icon, title, desc }) => (
                <button
                  key={id}
                  onClick={() => runUnstick(id)}
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
            {unstickText && (
              <div
                className="flex flex-col items-center gap-3 rounded-[13px] border p-[18px]"
                style={{ borderColor: "var(--edge)", background: "rgba(255,255,255,0.06)" }}
              >
                {unstickBreathing && (
                  <div
                    className="h-14 w-14 rounded-full"
                    style={{
                      background: "radial-gradient(circle at 50% 50%, var(--accent), rgba(255,255,255,0.05))",
                      animation: "breathe 9.5s ease-in-out infinite",
                    }}
                  />
                )}
                <div className="text-center text-[13.5px] leading-relaxed text-white/90">{unstickText}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="flex shrink-0 flex-col gap-2 border-t px-3 pb-3 pt-2.5"
        style={{ borderColor: "var(--edge-soft)" }}
      >
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={handlePlan}
            disabled={sending}
            className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] disabled:opacity-50"
            style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
          >
            <CalendarClock className="h-3 w-3" /> Plan my day
          </button>
          <button
            onClick={startBreakdown}
            className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px]"
            style={{
              borderColor: "var(--edge-soft)",
              background: pendingAction === "breakdown" ? "rgba(255,255,255,0.1)" : "transparent",
              color: pendingAction === "breakdown" ? "#fff" : "var(--dim)",
            }}
          >
            <ListTree className="h-3 w-3" /> Break down a task
          </button>
          <button
            onClick={startAskNotes}
            className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px]"
            style={{
              borderColor: "var(--edge-soft)",
              background: pendingAction === "ask-notes" ? "rgba(255,255,255,0.1)" : "transparent",
              color: pendingAction === "ask-notes" ? "#fff" : "var(--dim)",
            }}
          >
            <NotebookPen className="h-3 w-3" /> Ask your notes
          </button>
          <button
            onClick={() => setUnstickOpen((v) => !v)}
            className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px]"
            style={{
              borderColor: "var(--edge-soft)",
              background: unstickOpen ? "rgba(255,255,255,0.1)" : "transparent",
              color: unstickOpen ? "#fff" : "var(--dim)",
            }}
          >
            <Puzzle className="h-3 w-3" /> Unstick me
          </button>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <span
                key={i}
                title={c.text}
                className="flex items-center gap-1.5 rounded-[8px] border py-[3px] pl-2.5 pr-2 text-[11.5px] text-white/85"
                style={{ borderColor: "var(--edge-soft)", background: "rgba(255,255,255,0.09)" }}
              >
                {c.label}
                <button onClick={() => removeChip(i)} className="text-[var(--dim2)] hover:text-white">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <div
            className="flex items-end gap-2 rounded-[13px] border py-2 pl-3 pr-2"
            style={{ borderColor: "var(--edge)", background: "rgba(255,255,255,0.05)" }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={
                pendingAction === "breakdown"
                  ? "What's the vague task?"
                  : pendingAction === "ask-notes"
                    ? "Ask something about your notes…"
                    : "Ask, or just think out loud…"
              }
              className="max-h-[90px] min-h-5 flex-1 resize-none bg-transparent text-[13.5px] leading-relaxed outline-none placeholder:text-white/35"
            />
            <div className="flex items-center gap-0.5">
              <button
                title="Mention a task, note or session"
                onClick={openAttach}
                className="flex h-6.5 w-6.5 items-center justify-center rounded-[7px] text-[var(--dim)] hover:bg-white/[0.055] hover:text-white"
              >
                <AtSign className="h-[15px] w-[15px]" strokeWidth={1.9} />
              </button>
              <button
                title="Attach recent item"
                onClick={openAttach}
                className="flex h-6.5 w-6.5 items-center justify-center rounded-[7px] text-[var(--dim)] hover:bg-white/[0.055] hover:text-white"
              >
                <Paperclip className="h-[15px] w-[15px]" strokeWidth={1.9} />
              </button>
              <button
                title="Send"
                onClick={send}
                disabled={sending || !input.trim()}
                className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-white/90 text-[#111214] disabled:opacity-50"
              >
                <ArrowUp className="h-[15px] w-[15px]" strokeWidth={2} />
              </button>
            </div>
          </div>

          {attachOpen && (
            <div
              className="absolute bottom-full left-0 mb-2 flex w-[250px] flex-col gap-0.5 rounded-[14px] border p-1.5"
              style={{
                background: "rgba(18,19,23,0.86)",
                backdropFilter: "blur(24px)",
                borderColor: "var(--edge-hi)",
                boxShadow: "0 20px 50px -12px rgba(0,0,0,0.8)",
              }}
            >
              <div
                className="px-2.5 pb-1.5 pt-1.5 text-[11px] uppercase tracking-[0.06em]"
                style={{ color: "var(--dim2)" }}
              >
                Recent
              </div>
              {attachOptions.length === 0 && (
                <div className="px-2.5 py-2 text-[12.5px]" style={{ color: "var(--dim2)" }}>
                  Nothing yet
                </div>
              )}
              {attachOptions.map((o) => (
                <button
                  key={o.label}
                  onClick={() => {
                    addChip(o);
                    setAttachOpen(false);
                  }}
                  className="rounded-[9px] px-2.5 py-2 text-left text-[13px] text-white/88 hover:bg-white/10"
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-[11.5px]" style={{ color: "var(--dim2)" }}>
          Drag a window onto me, @-mention, or attach — I only see what you pass in.
        </div>
      </div>
    </div>
  );
}
