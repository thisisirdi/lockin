"use client";

import { useState } from "react";
import { useOSStore } from "@/lib/store/os";
import { WINDOW_META, type WindowId } from "@/lib/os/types";
import {
  Clock,
  Timer,
  CheckSquare,
  NotebookPen,
  Sparkles,
  BookOpenText,
  Blocks,
  Target,
  Music2,
  Clipboard,
  LayoutGrid,
  Type,
  Image as ImageIcon,
} from "lucide-react";
import { LayoutPopover } from "@/components/os/popovers/LayoutPopover";
import { FontPopover } from "@/components/os/popovers/FontPopover";
import { WallpaperPopover } from "@/components/os/popovers/WallpaperPopover";
import { cn } from "@/lib/utils";

const DOCK_ITEMS: { id: WindowId; icon: typeof Clock }[] = [
  { id: "clock", icon: Clock },
  { id: "timer", icon: Timer },
  { id: "tasks", icon: CheckSquare },
  { id: "notes", icon: NotebookPen },
  { id: "prompts", icon: BookOpenText },
  { id: "studio", icon: Blocks },
  { id: "freedom", icon: Target },
  { id: "ambient", icon: Music2 },
  { id: "clipboard", icon: Clipboard },
  { id: "ai", icon: Sparkles },
];

export function Dock({ stage }: { stage: { width: number; height: number } }) {
  const windows = useOSStore((s) => s.windows);
  const toggle = useOSStore((s) => s.toggle);
  const layoutName = useOSStore((s) => s.layoutName);
  const [openPop, setOpenPop] = useState<"layouts" | "font" | "wallpaper" | null>(null);

  return (
    <div
      className="absolute bottom-[18px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-[17px] border p-[7px]"
      style={{
        background: "rgba(15,16,20,0.5)",
        backdropFilter: "blur(28px) saturate(1.4)",
        WebkitBackdropFilter: "blur(28px) saturate(1.4)",
        borderColor: "var(--edge)",
        boxShadow: "0 20px 50px -18px rgba(0,0,0,0.8)",
      }}
    >
      {DOCK_ITEMS.map(({ id, icon: Icon }) => {
        const w = windows[id];
        const on = w.visible;
        return (
          <button
            key={id}
            title={WINDOW_META[id].label}
            onClick={() => toggle(id, stage)}
            className="relative flex h-9 w-9 items-center justify-center rounded-[11px] text-white/82 hover:bg-white/[0.055] hover:text-white"
            style={{ background: on ? "rgba(255,255,255,0.1)" : "transparent" }}
          >
            <Icon
              className="h-[17px] w-[17px]"
              strokeWidth={1.8}
              style={id === "ai" ? { color: "var(--accent)" } : undefined}
            />
            {on && (
              <span
                className="absolute bottom-[3px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                style={{ background: "var(--accent)" }}
              />
            )}
          </button>
        );
      })}

      <div className="mx-1 h-6 w-px" style={{ background: "var(--edge)" }} />

      <div className="relative">
        <button
          onClick={() => setOpenPop((p) => (p === "layouts" ? null : "layouts"))}
          className="flex h-8 items-center gap-[7px] rounded-[10px] px-[11px] text-[12.5px] text-white/82 hover:bg-white/[0.055] hover:text-white"
        >
          <LayoutGrid className="h-[15px] w-[15px]" strokeWidth={1.8} />
          {layoutName}
        </button>
        {openPop === "layouts" && (
          <LayoutPopover stage={stage} onClose={() => setOpenPop(null)} />
        )}
      </div>

      <div className="relative">
        <button
          title="Typeface"
          onClick={() => setOpenPop((p) => (p === "font" ? null : "font"))}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[10px] text-white/82 hover:bg-white/[0.055] hover:text-white"
          )}
        >
          <Type className="h-[15px] w-[15px]" strokeWidth={1.8} />
        </button>
        {openPop === "font" && <FontPopover onClose={() => setOpenPop(null)} />}
      </div>

      <div className="relative">
        <button
          title="Wallpaper"
          onClick={() => setOpenPop((p) => (p === "wallpaper" ? null : "wallpaper"))}
          className="flex h-8 w-8 items-center justify-center rounded-[10px] text-white/82 hover:bg-white/[0.055] hover:text-white"
        >
          <ImageIcon className="h-[15px] w-[15px]" strokeWidth={1.8} />
        </button>
        {openPop === "wallpaper" && <WallpaperPopover onClose={() => setOpenPop(null)} />}
      </div>
    </div>
  );
}
