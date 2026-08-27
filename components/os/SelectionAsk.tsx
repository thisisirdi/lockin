"use client";

import { useEffect, useRef, useState } from "react";
import { useCompanionStore } from "@/lib/store/companion";
import { useOSStore } from "@/lib/store/os";
import { Sparkles } from "lucide-react";

export function SelectionAsk({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const textRef = useRef("");
  const addChip = useCompanionStore((s) => s.addChip);
  const goTab = useCompanionStore((s) => s.goTab);
  const focus = useOSStore((s) => s.focus);

  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setPos(null);
        return;
      }
      const node = sel.anchorNode;
      const stage = stageRef.current;
      if (!stage || !node || !stage.contains(node.nodeType === 1 ? node : node.parentNode)) {
        setPos(null);
        return;
      }
      textRef.current = sel.toString();
      const r = sel.getRangeAt(0).getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      setPos({
        left: Math.max(8, Math.min(r.left - s.left + r.width / 2 - 68, s.width - 150)),
        top: Math.max(8, r.top - s.top - 38),
      });
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [stageRef]);

  if (!pos) return null;

  return (
    <button
      onClick={() => {
        const text = textRef.current.trim();
        addChip({
          label: `"${text.length > 34 ? text.slice(0, 34) + "…" : text}"`,
          text: `Selected text: "${text}"`,
        });
        setPos(null);
        window.getSelection()?.removeAllRanges();
        goTab("chat");
        focus("ai");
      }}
      className="flex items-center gap-1.5 rounded-[9px] border px-2.5 py-[5px] text-[12px] text-white"
      style={{
        position: "absolute",
        left: pos.left,
        top: pos.top,
        zIndex: 60,
        borderColor: "var(--edge-hi)",
        background: "rgba(20,21,25,0.9)",
        backdropFilter: "blur(14px)",
        boxShadow: "0 10px 30px -8px rgba(0,0,0,0.8)",
      }}
    >
      <Sparkles className="h-3 w-3" style={{ color: "var(--accent)" }} />
      Ask Companion
    </button>
  );
}
