"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJSON } from "@/lib/fetch-json";
import type { Task, TaskStatus } from "@/lib/types";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { tasks } = await fetchJSON<{ tasks: Task[] }>("/api/tasks");
      setTasks(tasks);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTask = useCallback(async (title: string, type: string) => {
    const { task } = await fetchJSON<{ task: Task }>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title, type }),
    });
    setTasks((prev) => [task, ...prev]);
  }, []);

  const setStatus = useCallback(async (id: string, status: TaskStatus) => {
    const { task } = await fetchJSON<{ task: Task }>(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
  }, []);

  const removeTask = useCallback(async (id: string) => {
    await fetchJSON(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { tasks, loading, addTask, setStatus, removeTask, refresh };
}
