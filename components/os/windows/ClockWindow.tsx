"use client";

import { useEffect, useState } from "react";
import { OSWindow } from "@/components/os/Window";
import { useStats } from "@/lib/hooks/use-stats";
import { useOSStore } from "@/lib/store/os";
import { bucketLevel } from "@/lib/streak";
import { Clock, Flame } from "lucide-react";

const LEVEL_OPACITY = [0.1, 0.3, 0.5, 0.75, 1];

function buildWeeks(dailyMinutes: Record<string, number>, weeksBack: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - weeksBack * 7);
  start.setDate(start.getDate() - start.getDay());

  const days: { date: string; minutes: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const date = cursor.toLocaleDateString("en-CA");
    days.push({ date, minutes: dailyMinutes[date] ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  const weeks: { date: string; minutes: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export function ClockWindow({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const [now, setNow] = useState<Date | null>(null);
  const visible = useOSStore((s) => s.windows.clock.visible);
  const stats = useStats(visible);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const initial = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  const time = now
    ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    : "--:--";
  const date = now
    ? now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
    : "";
  const todayHours = stats ? (stats.todayMinutes / 60).toFixed(1) : null;
  const weeks = stats ? buildWeeks(stats.dailyMinutes, 14) : [];

  return (
    <OSWindow id="clock" icon={<Clock className="h-[13px] w-[13px]" strokeWidth={1.9} />} stageRef={stageRef}>
      <div className="flex flex-col gap-[3px] px-4 pb-4 pt-3.5">
        <div className="font-mono text-[40px] font-light leading-none tracking-[-0.02em] tabular-nums">
          {time}
        </div>
        <div className="text-[12.5px]" style={{ color: "var(--dim)" }}>
          {date}
        </div>
        {stats && (
          <>
            <div className="mt-2 flex items-center gap-1.5 text-[12.5px] text-white/80">
              <Flame className="h-[13px] w-[13px]" style={{ color: "oklch(0.75 0.15 55)" }} />
              {stats.streak} day{stats.streak === 1 ? "" : "s"} · {todayHours}h today
            </div>
            <div className="mt-2.5 flex gap-[3px] overflow-hidden">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((d) => (
                    <div
                      key={d.date}
                      title={`${d.date}: ${(d.minutes / 60).toFixed(1)}h`}
                      className="h-[8px] w-[8px] rounded-[2px]"
                      style={{
                        background: "var(--accent)",
                        opacity: LEVEL_OPACITY[bucketLevel(d.minutes)],
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </OSWindow>
  );
}
