"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchJSON } from "@/lib/fetch-json";
import type { Category } from "@/lib/types";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { categories } = await fetchJSON<{ categories: Category[] }>(
        "/api/categories"
      );
      setCategories(categories);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addCategory = useCallback(
    async (name: string, color?: string) => {
      const { category } = await fetchJSON<{ category: Category }>(
        "/api/categories",
        { method: "POST", body: JSON.stringify({ name, color }) }
      );
      setCategories((prev) => [...prev, category]);
      return category;
    },
    []
  );

  return { categories, loading, refresh, addCategory };
}
