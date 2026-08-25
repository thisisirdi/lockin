"use client";

import { useCallback, useState } from "react";
import { fetchJSON } from "@/lib/fetch-json";
import type { ClipboardItem } from "@/lib/types";

export function useClipboardHistory() {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const { items } = await fetchJSON<{ items: ClipboardItem[] }>("/api/clipboard");
      setItems(items);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    load();
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await fetchJSON(`/api/clipboard?id=${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(async () => {
    await fetchJSON("/api/clipboard", { method: "DELETE" });
    setItems([]);
  }, []);

  return { items, loading, refresh, remove, clear };
}
