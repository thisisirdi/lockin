"use client";

import { useRef, type ReactNode } from "react";
import { useOSStore } from "@/lib/store/os";
import { WINDOW_META, type WindowId } from "@/lib/os/types";
import { useCompanionStore } from "@/lib/store/companion";
import { resolveWindowContext } from "@/lib/companion/resolve-window-context";
import { Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DROPPABLE: WindowId[] = ["tasks", "notes", "timer", "freedom", "prompts"];

export function OSWindow({
  id,
  icon,
  children,
  className,
  stageRef,
}: {
  id: WindowId;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  stageRef: React.RefObject<HTMLDivElement | null>;
}) {
  const win = useOSStore((s) => s.windows[id]);
  const focus = useOSStore((s) => s.focus);
  const hide = useOSStore((s) => s.hide);
  const commitGeometry = useOSStore((s) => s.commitGeometry);
  const elRef = useRef<HTMLDivElement>(null);

  if (!win.visible) return null;

  function stage() {
    return stageRef.current!.getBoundingClientRect();
  }

  function startDrag(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button, input, textarea, a")) return;
    e.preventDefault();
    focus(id);
    const s = stage();
    const r = elRef.current!.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    const droppable = DROPPABLE.includes(id);
    let overAI = false;

    function move(ev: PointerEvent) {
      let x = ev.clientX - s.left - dx;
      let y = ev.clientY - s.top - dy;
      x = Math.round(x / 8) * 8;
      y = Math.round(y / 8) * 8;
      x = Math.max(-r.width + 80, Math.min(x, s.width - 80));
      y = Math.max(0, Math.min(y, s.height - 40));
      if (elRef.current) {
        elRef.current.style.left = `${x}px`;
        elRef.current.style.top = `${y}px`;
      }
      if (droppable) {
        const aiEl = document.querySelector('[data-os-window="ai"]');
        if (aiEl) {
          const ar = aiEl.getBoundingClientRect();
          overAI =
            ev.clientX > ar.left && ev.clientX < ar.right && ev.clientY > ar.top && ev.clientY < ar.bottom;
          (aiEl as HTMLElement).style.outline = overAI
            ? "1.5px dashed var(--accent)"
            : "";
        }
      }
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const s2 = stage();
      const r2 = elRef.current!.getBoundingClientRect();
      commitGeometry(id, { x: r2.left - s2.left, y: r2.top - s2.top });

      if (droppable && overAI) {
        const aiEl = document.querySelector('[data-os-window="ai"]') as HTMLElement | null;
        if (aiEl) aiEl.style.outline = "";
        const companion = useCompanionStore.getState();
        companion.goTab("chat");
        useOSStore.getState().focus("ai");
        resolveWindowContext(id).then((chip) => {
          if (chip) companion.addChip(chip);
        });
      }
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    focus(id);
    const r = elRef.current!.getBoundingClientRect();
    const x0 = e.clientX;
    const y0 = e.clientY;
    const w0 = r.width;
    const h0 = r.height;

    function move(ev: PointerEvent) {
      if (!elRef.current) return;
      elRef.current.style.width = `${Math.max(240, w0 + ev.clientX - x0)}px`;
      elRef.current.style.height = `${Math.max(150, h0 + ev.clientY - y0)}px`;
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (elRef.current) {
        commitGeometry(id, {
          w: elRef.current.offsetWidth,
          h: elRef.current.offsetHeight,
        });
      }
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      ref={elRef}
      data-os-window={id}
      onPointerDown={() => focus(id)}
      style={{
        position: "absolute",
        left: win.geometry.x,
        top: win.geometry.y,
        width: win.geometry.w,
        height: win.geometry.h ?? undefined,
        zIndex: win.z,
        background: "var(--glass)",
        backdropFilter: "blur(var(--blur)) saturate(1.35)",
        WebkitBackdropFilter: "blur(var(--blur)) saturate(1.35)",
        border: "1px solid var(--edge)",
        boxShadow: "0 18px 50px -22px rgba(0,0,0,0.65)",
      }}
      className={cn(
        "flex flex-col overflow-hidden rounded-[18px] text-white/93",
        className
      )}
    >
      <div
        onPointerDown={startDrag}
        className="flex cursor-grab items-center gap-[7px] border-b px-2.5 py-[9px] pl-3 active:cursor-grabbing"
        style={{ borderColor: "var(--edge-soft)" }}
      >
        <span className="flex shrink-0 text-[var(--dim)]">{icon}</span>
        <span
          className="whitespace-nowrap text-[11.5px] uppercase tracking-[0.06em]"
          style={{ color: "var(--dim)" }}
        >
          {WINDOW_META[id].label}
        </span>
        <span className="flex-1" />
        <button
          title="Minimise"
          onClick={() => hide(id, true)}
          className="flex h-5 w-5 items-center justify-center rounded-md text-[var(--dim2)] hover:bg-white/[0.055] hover:text-white/90"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          title="Close"
          onClick={() => hide(id, false)}
          className="flex h-5 w-5 items-center justify-center rounded-md text-[var(--dim2)] hover:bg-white/[0.055] hover:text-white/90"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1">{children}</div>

      <div
        onPointerDown={startResize}
        className="absolute bottom-0 right-0 h-[18px] w-[18px] cursor-nwse-resize"
      />
    </div>
  );
}
