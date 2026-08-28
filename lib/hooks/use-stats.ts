"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/fetch-json";

export interface Stats {
  streak: number;
  minMinutes: number;
  timezone: string;
  todayMinutes: number;
  dailyMinutes: Record<string, number>;
}

export function useStats(enabled = true) {
  const { data } = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchJSON<Stats>("/api/stats"),
    enabled,
  });
  return data ?? null;
}
