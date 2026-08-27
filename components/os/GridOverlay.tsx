"use client";

import { useOSStore } from "@/lib/store/os";
import { GRID } from "@/lib/os/snap";

export function GridOverlay() {
  const interacting = useOSStore((s) => s.interacting);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-150"
      style={{
        opacity: interacting ? 1 : 0,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)",
        backgroundSize: `${GRID}px ${GRID}px`,
      }}
    />
  );
}
