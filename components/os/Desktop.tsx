"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useOSStore } from "@/lib/store/os";
import { getRoomBackground } from "@/lib/room-backgrounds";
import { WINDOW_IDS } from "@/lib/os/types";
import { ClockWindow } from "@/components/os/windows/ClockWindow";
import { TimerWindow } from "@/components/os/windows/TimerWindow";
import { FreedomWindow } from "@/components/os/windows/FreedomWindow";
import { AmbientWindow } from "@/components/os/windows/AmbientWindow";
import { TasksWindow } from "@/components/os/windows/TasksWindow";
import { NotesWindow } from "@/components/os/windows/NotesWindow";
import { PromptsWindow } from "@/components/os/windows/PromptsWindow";
import { ClipboardWindow } from "@/components/os/windows/ClipboardWindow";
import { Companion } from "@/components/os/companion/Companion";
import { Dock } from "@/components/os/Dock";
import { SelectionAsk } from "@/components/os/SelectionAsk";
import { UserMenu } from "@/components/nav/user-menu";

export function Desktop({
  email,
  avatarUrl,
}: {
  email: string | null;
  avatarUrl: string | null;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ width: 1240, height: 780 });
  const wallpaper = useOSStore((s) => s.wallpaper);
  const font = useOSStore((s) => s.font);
  const accent = useOSStore((s) => s.accent);
  const glassOpacity = useOSStore((s) => s.glassOpacity);
  const blur = useOSStore((s) => s.blur);
  const windows = useOSStore((s) => s.windows);
  const applyLayout = useOSStore((s) => s.applyLayout);

  useEffect(() => {
    function measure() {
      if (!stageRef.current) return;
      const r = stageRef.current.getBoundingClientRect();
      setStage({ width: r.width, height: r.height });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const noneVisible = WINDOW_IDS.every((id) => !windows[id].visible && !windows[id].minimized);
    if (noneVisible && stage.width > 0) applyLayout("home", stage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.width > 0]);

  const background = getRoomBackground(wallpaper);

  const cssVars = {
    "--font": font,
    "--mono": "'Geist Mono', ui-monospace, monospace",
    "--glass": `rgba(13,14,17,${glassOpacity})`,
    "--glass-2": "rgba(255,255,255,0.055)",
    "--edge": "rgba(255,255,255,0.13)",
    "--edge-hi": "rgba(255,255,255,0.26)",
    "--edge-soft": "rgba(255,255,255,0.08)",
    "--blur": `${blur}px`,
    "--accent": accent,
    "--dim": "rgba(255,255,255,0.55)",
    "--dim2": "rgba(255,255,255,0.38)",
    fontFamily: "var(--font)",
  } as React.CSSProperties;

  return (
    <div
      ref={stageRef}
      style={cssVars}
      className="relative h-screen w-full select-none overflow-hidden text-[14px] font-normal text-white/93 antialiased"
    >
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- runtime-switchable font picker, can't be a static next/font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+JP:wght@300;400;500;600&family=Zen+Kaku+Gothic+New:wght@300;400;500&family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&family=Nunito+Sans:wght@300;400;500;600&family=Spline+Sans:wght@300;400;500;600&family=Geist+Mono:wght@300;400;500&display=swap"
      />

      {background && (
        <Image
          src={`/room-backgrounds/${background.file}`}
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-[1.04] object-cover"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(6,7,9,0.42) 0%, rgba(6,7,9,0.62) 55%, rgba(6,7,9,0.78) 100%)",
        }}
      />

      <div className="absolute right-3.5 top-3.5 z-50">
        <UserMenu email={email} avatarUrl={avatarUrl} />
      </div>

      <ClockWindow stageRef={stageRef} />
      <TimerWindow stageRef={stageRef} />
      <FreedomWindow stageRef={stageRef} />
      <AmbientWindow stageRef={stageRef} />
      <TasksWindow stageRef={stageRef} />
      <NotesWindow stageRef={stageRef} />
      <PromptsWindow stageRef={stageRef} />
      <ClipboardWindow stageRef={stageRef} />
      <Companion stageRef={stageRef} stage={stage} />

      <SelectionAsk stageRef={stageRef} />
      <Dock stage={stage} />
    </div>
  );
}
