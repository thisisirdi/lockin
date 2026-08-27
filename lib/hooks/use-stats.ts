"use client";

import { useEffect, useState } from "react";
import { fetchJSON } from "@/lib/fetch-json";

export interface Stats {
  streak: number;
  minMinutes: number;
  timezone: string;
  todayMinutes: number;
  dailyMinutes: Record<string, number>;
}

export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchJSON<Stats>("/api/stats").then(setStats).catch(() => {});
  }, []);

  return stats;
}
