"use client";

import { useEffect, useState } from "react";
import { OSWindow } from "@/components/os/Window";
import { fetchJSON } from "@/lib/fetch-json";
import type { RoomSettings } from "@/lib/types";
import { Music2, Volume2 } from "lucide-react";
import { toast } from "sonner";

const SOUNDS = ["Rain", "Lo-fi", "Café", "Forest", "Binaural"];

export function AmbientWindow({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const [settings, setSettings] = useState<RoomSettings | null>(null);
  const [sound, setSound] = useState("Rain");
  const [urlInput, setUrlInput] = useState("");

  useEffect(() => {
    fetchJSON<{ profile: { room_settings: RoomSettings } }>("/api/profile").then(
      ({ profile }) => {
        setSettings(profile.room_settings);
        setUrlInput(profile.room_settings.youtube_url ?? "");
      }
    );
  }, []);

  function persist(next: RoomSettings) {
    setSettings(next);
    fetchJSON("/api/profile", {
      method: "PATCH",
      body: JSON.stringify({ roomSettings: next }),
    }).catch(() => toast.error("Couldn't save"));
  }

  if (!settings) return null;

  return (
    <OSWindow id="ambient" icon={<Music2 className="h-[13px] w-[13px]" strokeWidth={1.9} />} stageRef={stageRef}>
      <div className="flex flex-col gap-[13px] px-4 pb-4 pt-3.5">
        <div className="flex flex-wrap gap-1.5">
          {SOUNDS.map((s) => {
            const on = sound === s;
            return (
              <button
                key={s}
                onClick={() => {
                  setSound(s);
                  toast(`${s} playing`);
                }}
                className="rounded-[9px] border px-[11px] py-[5px] text-[12.5px]"
                style={{
                  borderColor: on ? "var(--edge-hi)" : "var(--edge-soft)",
                  background: on ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.04)",
                  color: on ? "#fff" : "var(--dim)",
                }}
              >
                {s}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-[9px]">
          <Volume2 className="h-[15px] w-[15px] shrink-0" style={{ color: "var(--dim)" }} />
          <div className="relative h-1 flex-1 rounded-full bg-white/[0.15]">
            <div
              className="h-full rounded-full bg-white/75"
              style={{ width: `${settings.volume}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={settings.volume}
              onChange={(e) => persist({ ...settings, volume: Number(e.target.value) })}
              className="absolute inset-0 h-4 w-full -translate-y-1.5 cursor-pointer opacity-0"
            />
            <div
              className="pointer-events-none absolute -top-1 h-3 w-3 -translate-x-1/2 rounded-full bg-white shadow"
              style={{ left: `${settings.volume}%` }}
            />
          </div>
          <span
            className="w-6 text-right font-mono text-[11.5px]"
            style={{ color: "var(--dim)" }}
          >
            {settings.volume}
          </span>
        </div>

        <form
          className="flex items-center gap-[7px] rounded-[10px] border px-2.5 py-[7px]"
          style={{ borderColor: "var(--edge-soft)", background: "rgba(255,255,255,0.04)" }}
          onSubmit={(e) => {
            e.preventDefault();
            persist({ ...settings, youtube_url: urlInput || null });
          }}
        >
          <span className="text-[12px]" style={{ color: "var(--dim2)" }}>
            YouTube
          </span>
          <input
            placeholder="paste a URL…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={() => persist({ ...settings, youtube_url: urlInput || null })}
            className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-white/35"
          />
        </form>

        <div className="text-[11.5px] leading-relaxed" style={{ color: "var(--dim2)" }}>
          {sound} is playing. Change the wallpaper from the dock.
        </div>
      </div>
    </OSWindow>
  );
}
