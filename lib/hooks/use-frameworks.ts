"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/fetch-json";
import type { Framework } from "@/lib/types";

export function useFrameworks(enabled = true) {
  const { data, isLoading } = useQuery({
    queryKey: ["frameworks"],
    queryFn: () => fetchJSON<{ frameworks: Framework[] }>("/api/frameworks").then((r) => r.frameworks),
    enabled,
    staleTime: 5 * 60_000,
  });
  return { frameworks: data ?? [], loading: isLoading };
}
