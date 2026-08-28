"use client";

import { useRef, type ReactNode } from "react";
import { useOSStore } from "@/lib/store/os";
import { WINDOW_META, type WindowId } from "@/lib/os/types";
import { useCompanionStore } from "@/lib/store/companion";
import { useStudioStore } from "@/lib/store/studio";
import { resolveWindowContext } from "@/lib/companion/resolve-window-context";
import { collectSnapTargets, snapPosition, snapSingleEdge } from "@/lib/os/snap";
import { Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DROPPABLE: WindowId[] = ["tasks", "notes", "timer", "freedom", "prompts"];

/** Windows that accept a dragged window as attached context, and what happens on drop. */
const DROP_TARGETS: WindowId[] = ["ai", "studio"];

function attachToTarget(targetId: WindowId, chip: { label: string; text: string }) {
  if (targetId === "ai") {
    useCompanionStore.getState().goTab("chat");
    useCompanionStore.getState().addChip(chip);
  } else if (targetId === "studio") {
    useStudioStore.getState().addContextChip(chip);
  }
  useOSStore.getState().focus(targetId);
}

const MIN_W = 240;
const MIN_H = 150;

type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const RESIZE_HANDLES: { edge: ResizeEdge; className: string; cursor: string }[] = [
  { edge: "n", className: "left-2 right-2 top-0 h-2", cursor: "ns-resize" },
  { edge: "s", className: "left-2 right-2 bottom-0 h-2", cursor: "ns-resize" },
  { edge: "e", className: "top-2 bottom-2 right-0 w-2", cursor: "ew-resize" },
  { edge: "w", className: "top-2 bottom-2 left-0 w-2", cursor: "ew-resize" },
  { edge: "ne", className: "right-0 top-0 h-3 w-3", cursor: "nesw-resize" },
  { edge: "nw", className: "left-0 top-0 h-3 w-3", cursor: "nwse-resize" },
  { edge: "se", className: "right-0 bottom-0 h-3 w-3", cursor: "nwse-resize" },
  { edge: "sw", className: "left-0 bottom-0 h-3 w-3", cursor: "nesw-resize" },
];

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
  const setInteracting = useOSStore((s) => s.setInteracting);
  const elRef = useRef<HTMLDivElement>(null);

  if (!win.visible) return null;

  function stage() {
    return stageRef.current!.getBoundingClientRect();
  }

  function startDrag(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button, input, textarea, a")) return;
    e.preventDefault();
    focus(id);
    setInteracting(true);
    const s = stage();
    const r = elRef.current!.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    const droppable = DROPPABLE.includes(id);
    let overTarget: WindowId | null = null;

    function move(ev: PointerEvent) {
      let x = ev.clientX - s.left - dx;
      let y = ev.clientY - s.top - dy;

      if (stageRef.current) {
        const { xs, ys } = collectSnapTargets(stageRef.current, id);
        x = snapPosition(x, r.width, xs);
        y = snapPosition(y, r.height, ys);
      }

      x = Math.max(-r.width + 80, Math.min(x, s.width - 80));
      y = Math.max(0, Math.min(y, s.height - 40));
      if (elRef.current) {
        elRef.current.style.left = `${x}px`;
        elRef.current.style.top = `${y}px`;
      }
      if (droppable) {
        overTarget = null;
        for (const targetId of DROP_TARGETS) {
          const targetEl = document.querySelector(`[data-os-window="${targetId}"]`) as HTMLElement | null;
          if (!targetEl) continue;
          const tr = targetEl.getBoundingClientRect();
          const hit =
            ev.clientX > tr.left && ev.clientX < tr.right && ev.clientY > tr.top && ev.clientY < tr.bottom;
          targetEl.style.outline = hit ? "1.5px dashed var(--accent)" : "";
          if (hit) overTarget = targetId;
        }
      }
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setInteracting(false);
      const s2 = stage();
      const r2 = elRef.current!.getBoundingClientRect();
      commitGeometry(id, { x: r2.left - s2.left, y: r2.top - s2.top });

      if (droppable && overTarget) {
        const targetId = overTarget;
        const targetEl = document.querySelector(`[data-os-window="${targetId}"]`) as HTMLElement | null;
        if (targetEl) targetEl.style.outline = "";
        resolveWindowContext(id).then((chip) => {
          if (chip) attachToTarget(targetId, chip);
        });
      }
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startResize(e: React.PointerEvent, edge: ResizeEdge) {
    e.preventDefault();
    e.stopPropagation();
    focus(id);
    setInteracting(true);
    const s = stage();
    const r = elRef.current!.getBoundingClientRect();
    const left0 = r.left - s.left;
    const top0 = r.top - s.top;
    const right0 = left0 + r.width;
    const bottom0 = top0 + r.height;

    const affects = {
      n: edge.includes("n"),
      s: edge.includes("s"),
      e: edge.includes("e"),
      w: edge.includes("w"),
    };

    function move(ev: PointerEvent) {
      if (!elRef.current || !stageRef.current) return;
      const px = ev.clientX - s.left;
      const py = ev.clientY - s.top;
      const { xs, ys } = collectSnapTargets(stageRef.current, id);

      let left = left0;
      let right = right0;
      let top = top0;
      let bottom = bottom0;

      if (affects.w) left = Math.min(snapSingleEdge(px, xs), right0 - MIN_W);
      if (affects.e) right = Math.max(snapSingleEdge(px, xs), left0 + MIN_W);
      if (affects.n) top = Math.min(snapSingleEdge(py, ys), bottom0 - MIN_H);
      if (affects.s) bottom = Math.max(snapSingleEdge(py, ys), top0 + MIN_H);

      elRef.current.style.left = `${left}px`;
      elRef.current.style.top = `${top}px`;
      elRef.current.style.width = `${right - left}px`;
      elRef.current.style.height = `${bottom - top}px`;
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setInteracting(false);
      if (elRef.current) {
        const s2 = stage();
        const r2 = elRef.current.getBoundingClientRect();
        commitGeometry(id, {
          x: r2.left - s2.left,
          y: r2.top - s2.top,
          w: r2.width,
          h: r2.height,
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

      {RESIZE_HANDLES.map(({ edge, className, cursor }) => (
        <div
          key={edge}
          onPointerDown={(e) => startResize(e, edge)}
          className={cn("absolute", className)}
          style={{ cursor }}
        />
      ))}
    </div>
  );
}
