"use client";

import { useEffect, useState } from "react";
import { fetchJSON } from "@/lib/fetch-json";
import { bucketLevel } from "@/lib/streak";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsResponse {
  streak: number;
  minMinutes: number;
  dailyMinutes: Record<string, number>;
}

const LEVEL_CLASSES = [
  "bg-muted",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
];

function buildWeeks(dailyMinutes: Record<string, number>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 370);
  // Align to the preceding Sunday so columns line up as full weeks.
  start.setDate(start.getDate() - start.getDay());

  const days: { date: string; minutes: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const date = cursor.toLocaleDateString("en-CA");
    days.push({ date, minutes: dailyMinutes[date] ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks: { date: string; minutes: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export function Heatmap() {
  const [data, setData] = useState<StatsResponse | null>(null);

  useEffect(() => {
    fetchJSON<StatsResponse>("/api/stats").then(setData).catch(() => {});
  }, []);

  const weeks = data ? buildWeeks(data.dailyMinutes) : [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Deep work heatmap</CardTitle>
        {data && (
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Flame className="h-4 w-4 text-orange-500" />
            {data.streak} day{data.streak === 1 ? "" : "s"} locked in
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="h-24 animate-pulse rounded bg-muted" />
        ) : (
          <div className="flex gap-1 overflow-x-auto pb-2">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${(day.minutes / 60).toFixed(1)}h`}
                    className={cn(
                      "h-3 w-3 rounded-sm",
                      LEVEL_CLASSES[bucketLevel(day.minutes)]
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
