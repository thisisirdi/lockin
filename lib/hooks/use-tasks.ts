"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/fetch-json";
import type { Task, TaskStatus } from "@/lib/types";

const tasksKey = ["tasks"] as const;

export function useTasks(enabled = true) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: tasksKey,
    queryFn: () => fetchJSON<{ tasks: Task[] }>("/api/tasks").then((r) => r.tasks),
    enabled,
  });
  const tasks = data ?? [];

  const addTaskMutation = useMutation({
    mutationFn: (vars: { title: string; type: string }) =>
      fetchJSON<{ task: Task }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify(vars),
      }).then((r) => r.task),
    onSuccess: (task) => {
      queryClient.setQueryData<Task[]>(tasksKey, (prev) => [task, ...(prev ?? [])]);
    },
  });

  const setStatusMutation = useMutation({
    mutationFn: (vars: { id: string; status: TaskStatus }) =>
      fetchJSON<{ task: Task }>(`/api/tasks/${vars.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: vars.status }),
      }).then((r) => r.task),
    onSuccess: (task) => {
      queryClient.setQueryData<Task[]>(tasksKey, (prev) =>
        (prev ?? []).map((t) => (t.id === task.id ? task : t))
      );
    },
  });

  const removeTaskMutation = useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Task[]>(tasksKey, (prev) => (prev ?? []).filter((t) => t.id !== id));
    },
  });

  return {
    tasks,
    loading: isLoading,
    addTask: (title: string, type: string) => addTaskMutation.mutateAsync({ title, type }),
    setStatus: (id: string, status: TaskStatus) => setStatusMutation.mutateAsync({ id, status }),
    removeTask: (id: string) => removeTaskMutation.mutateAsync(id),
    refresh: () => queryClient.invalidateQueries({ queryKey: tasksKey }),
  };
}
