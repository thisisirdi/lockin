"use client";

import { useEffect, useRef, useState } from "react";
import { useCompanionStore } from "@/lib/store/companion";
import { fetchJSON } from "@/lib/fetch-json";
import { fetchAttachOptions, type AttachOption } from "@/lib/companion/attach-options";
import { toast } from "sonner";
import { AtSign, Paperclip, ArrowUp, X } from "lucide-react";

export function ChatTab() {
  const messages = useCompanionStore((s) => s.messages);
  const chips = useCompanionStore((s) => s.chips);
  const addMessage = useCompanionStore((s) => s.addMessage);
  const addChip = useCompanionStore((s) => s.addChip);
  const removeChip = useCompanionStore((s) => s.removeChip);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachOptions, setAttachOptions] = useState<AttachOption[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages]);

  async function openAttach() {
    setAttachOpen((v) => !v);
    if (attachOptions.length === 0) setAttachOptions(await fetchAttachOptions());
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    addMessage({ role: "user", content: text });
    setSending(true);
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
            className={`flex max-w-[88%] flex-col gap-1.5 ${m.role === "user" ? "self-end items-end" : ""}`}
          >
            <span className="text-[11px] uppercase tracking-[0.05em]" style={{ color: "var(--dim2)" }}>
              {m.role === "user" ? "You" : "Companion"}
            </span>
            <div
              className="whitespace-pre-wrap px-3 py-2.5 text-[13.5px] leading-relaxed"
              style={{
                borderRadius: m.role === "user" ? "13px 13px 4px 13px" : "13px 13px 13px 4px",
                background: m.role === "user" ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)",
                border: m.role === "user" ? undefined : "1px solid var(--edge-soft)",
              }}
            >
              {m.content}
            </div>
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
      </div>

      <div
        className="flex shrink-0 flex-col gap-2 border-t px-3 pb-3 pt-2.5"
        style={{ borderColor: "var(--edge-soft)" }}
      >
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
              placeholder="Ask, or just think out loud…"
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
