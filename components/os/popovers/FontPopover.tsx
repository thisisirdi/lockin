"use client";

import { useOSStore } from "@/lib/store/os";

const FONTS = [
  { stack: "'IBM Plex Sans JP', system-ui, sans-serif", label: "IBM Plex Sans JP" },
  { stack: "'Zen Kaku Gothic New', system-ui, sans-serif", label: "Zen Kaku Gothic" },
  { stack: "'Newsreader', Georgia, serif", label: "Newsreader" },
  { stack: "'Nunito Sans', system-ui, sans-serif", label: "Nunito Sans" },
  { stack: "'Spline Sans', system-ui, sans-serif", label: "Spline Sans" },
];

export function FontPopover({ onClose }: { onClose: () => void }) {
  const font = useOSStore((s) => s.font);
  const setFont = useOSStore((s) => s.setFont);

  return (
    <div
      className="absolute bottom-full left-1/2 mb-2.5 flex w-[238px] -translate-x-1/2 flex-col gap-0.5 rounded-[14px] border p-1.5"
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
        Typeface
      </div>
      {FONTS.map((f) => {
        const on = font === f.stack;
        return (
          <button
            key={f.stack}
            onClick={() => {
              setFont(f.stack);
              onClose();
            }}
            className="flex items-center justify-between rounded-[9px] px-2.5 py-2 text-left text-[13.5px]"
            style={{
              background: on ? "rgba(255,255,255,0.1)" : "transparent",
              color: on ? "#fff" : "rgba(255,255,255,0.85)",
              fontFamily: f.stack,
            }}
          >
            {f.label}
            {on && <span className="text-[11px]" style={{ color: "var(--accent)" }}>on</span>}
          </button>
        );
      })}
    </div>
  );
}
