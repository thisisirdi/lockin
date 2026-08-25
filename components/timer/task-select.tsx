"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTasks } from "@/lib/hooks/use-tasks";
import { ListTodo } from "lucide-react";

export function TaskSelect({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (taskId: string | null) => void;
  disabled?: boolean;
}) {
  const { tasks } = useTasks();
  const open = useMemo(() => tasks.filter((t) => t.status === "todo"), [tasks]);

  if (open.length === 0) return null;

  return (
    <Select
      value={value ?? "__none"}
      onValueChange={(v) => onChange(v === "__none" ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger className="w-44">
        <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue placeholder="Link a task" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">No task</SelectItem>
        {open.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
