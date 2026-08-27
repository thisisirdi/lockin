"use client";

import Image from "next/image";
import { useOSStore } from "@/lib/store/os";
import { ROOM_BACKGROUNDS } from "@/lib/room-backgrounds";
import { cn } from "@/lib/utils";

export function WallpaperPopover({ onClose }: { onClose: () => void }) {
  const wallpaper = useOSStore((s) => s.wallpaper);
  const setWallpaper = useOSStore((s) => s.setWallpaper);

  return (
    <div
      className="absolute bottom-full right-0 mb-2.5 flex w-[280px] flex-col gap-2 rounded-[14px] border p-2"
      style={{
        background: "rgba(18,19,23,0.86)",
        backdropFilter: "blur(24px)",
        borderColor: "var(--edge-hi)",
        boxShadow: "0 20px 50px -12px rgba(0,0,0,0.8)",
      }}
    >
      <div
        className="px-0.5 pt-0.5 text-[11px] uppercase tracking-[0.06em]"
        style={{ color: "var(--dim2)" }}
      >
        Wallpaper
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {ROOM_BACKGROUNDS.map((bg) => {
          const on = wallpaper === bg.id;
          return (
            <button
              key={bg.id}
              title={bg.label}
              onClick={() => {
                setWallpaper(bg.id);
                onClose();
              }}
              className={cn(
                "relative aspect-[16/10] overflow-hidden rounded-[9px] p-0 transition-opacity",
                on ? "opacity-100" : "opacity-80 hover:opacity-100"
              )}
              style={{ border: `1.5px solid ${on ? "var(--accent)" : "transparent"}` }}
            >
              <Image
                src={`/room-backgrounds/${bg.file}`}
                alt={bg.label}
                fill
                sizes="90px"
                className="object-cover"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
