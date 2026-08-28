"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/fetch-json";
import type { Category } from "@/lib/types";

const categoriesKey = ["categories"] as const;

export function useCategories(enabled = true) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: categoriesKey,
    queryFn: () => fetchJSON<{ categories: Category[] }>("/api/categories").then((r) => r.categories),
    enabled,
  });
  const categories = data ?? [];

  const addMutation = useMutation({
    mutationFn: (vars: { name: string; color?: string }) =>
      fetchJSON<{ category: Category }>("/api/categories", {
        method: "POST",
        body: JSON.stringify(vars),
      }).then((r) => r.category),
    onSuccess: (category) => {
      queryClient.setQueryData<Category[]>(categoriesKey, (prev) => [...(prev ?? []), category]);
    },
  });

  return {
    categories,
    loading: isLoading,
    refresh: () => refetch(),
    addCategory: (name: string, color?: string) => addMutation.mutateAsync({ name, color }),
  };
}
