"use client";

import { useOSStore } from "@/lib/store/os";
import { LAYOUTS } from "@/lib/os/types";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const PRESET_ORDER = ["home", "deep", "writing", "planning"] as const;
const SUBTITLES: Record<string, string> = {
  home: "",
  deep: "timer + ambient",
  writing: "notes wide",
  planning: "tasks + companion",
};

export function LayoutPopover({
  stage,
  onClose,
}: {
  stage: { width: number; height: number };
  onClose: () => void;
}) {
  const layout = useOSStore((s) => s.layout);
  const applyLayout = useOSStore((s) => s.applyLayout);
  const saveCurrentLayout = useOSStore((s) => s.saveCurrentLayout);
  const savedLayouts = useOSStore((s) => s.savedLayouts);

  return (
    <div
      className="absolute bottom-full left-1/2 mb-2.5 flex w-[230px] -translate-x-1/2 flex-col gap-0.5 rounded-[14px] border p-1.5"
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
        Layouts
      </div>
      {PRESET_ORDER.map((key) => {
        const on = layout === key;
        return (
          <button
            key={key}
            onClick={() => {
              applyLayout(key, stage);
              onClose();
            }}
            className="rounded-[9px] px-2.5 py-2 text-left text-[13px]"
            style={{
              background: on ? "rgba(255,255,255,0.1)" : "transparent",
              color: on ? "#fff" : "rgba(255,255,255,0.85)",
            }}
          >
            {LAYOUTS[key].name}
            {SUBTITLES[key] && (
              <span style={{ color: "var(--dim2)" }}> · {SUBTITLES[key]}</span>
            )}
          </button>
        );
      })}
      {Object.entries(savedLayouts).map(([key, def]) => (
        <button
          key={key}
          onClick={() => {
            applyLayout(key, stage);
            onClose();
          }}
          className="rounded-[9px] px-2.5 py-2 text-left text-[13px]"
          style={{
            background: layout === key ? "rgba(255,255,255,0.1)" : "transparent",
            color: layout === key ? "#fff" : "rgba(255,255,255,0.85)",
          }}
        >
          {def.name}
        </button>
      ))}
      <div className="my-1 mx-1.5 h-px" style={{ background: "var(--edge-soft)" }} />
      <button
        onClick={() => {
          saveCurrentLayout();
          toast.success("Saved this arrangement");
          onClose();
        }}
        className="flex items-center gap-[7px] rounded-[9px] px-2.5 py-2 text-left text-[13px] text-white/85 hover:bg-white/10"
      >
        <Plus className="h-[13px] w-[13px]" />
        Save this arrangement
      </button>
    </div>
  );
}
