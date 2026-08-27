"use client";

import { useState } from "react";
import { OSWindow } from "@/components/os/Window";
import { usePrompts } from "@/lib/hooks/use-prompts";
import { copyWithHistory } from "@/lib/copy";
import { Sparkles, Copy, Plus } from "lucide-react";

export function PromptsWindow({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const { prompts, createPrompt, trackUsage } = usePrompts();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <OSWindow id="prompts" icon={<Sparkles className="h-[13px] w-[13px]" strokeWidth={1.9} />} stageRef={stageRef}>
      <div className="flex flex-col gap-2 px-3.5 pb-3.5 pt-3">
        {adding ? (
          <div className="flex flex-col gap-1.5">
            <input
              autoFocus
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 rounded-[9px] border bg-transparent px-2.5 text-[13px] outline-none placeholder:text-white/35"
              style={{ borderColor: "var(--edge-soft)" }}
            />
            <textarea
              placeholder="Prompt body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-16 resize-none rounded-[9px] border bg-transparent p-2.5 text-[12.5px] outline-none placeholder:text-white/35"
              style={{ borderColor: "var(--edge-soft)" }}
            />
            <button
              onClick={async () => {
                if (!title.trim() || !body.trim()) return;
                await createPrompt(title.trim(), body.trim());
                setTitle("");
                setBody("");
                setAdding(false);
              }}
              className="h-8 rounded-[9px] bg-white/92 text-[12.5px] font-medium text-[#111214]"
            >
              Save prompt
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-1.5 rounded-[9px] border py-[7px] text-[12.5px]"
            style={{ borderColor: "var(--edge-soft)", color: "var(--dim)" }}
          >
            <Plus className="h-3.5 w-3.5" /> New prompt
          </button>
        )}

        <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
          {prompts.slice(0, 8).map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-1 rounded-[11px] border p-2.5"
              style={{ borderColor: "var(--edge-soft)", background: "rgba(255,255,255,0.045)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px]">{p.title}</span>
                <button
                  onClick={() => {
                    copyWithHistory(p.body, "prompt");
                    trackUsage(p.id);
                  }}
                  className="shrink-0 text-white/50 hover:text-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="line-clamp-2 text-[12px] leading-relaxed" style={{ color: "var(--dim)" }}>
                {p.body}
              </p>
              {p.usage_count > 0 && (
                <span className="text-[11px]" style={{ color: "var(--dim2)" }}>
                  used {p.usage_count}×
                </span>
              )}
            </div>
          ))}
          {prompts.length === 0 && (
            <p className="py-3 text-center text-[12.5px]" style={{ color: "var(--dim2)" }}>
              No saved prompts.
            </p>
          )}
        </div>
      </div>
    </OSWindow>
  );
}
