"use client";

import { useState } from "react";
import { TimerCard } from "@/components/timer/timer-card";
import { Heatmap } from "@/components/heatmap/heatmap";
import { useTasks } from "@/lib/hooks/use-tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { tasks, setStatus } = useTasks();
  const [heatmapKey, setHeatmapKey] = useState(0);
  const todo = tasks.filter((t) => t.status === "todo").slice(0, 5);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <TimerCard onSessionSaved={() => setHeatmapKey((k) => k + 1)} />
      <Heatmap key={heatmapKey} />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Up next</CardTitle>
          <Link
            href="/tasks"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            All tasks <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-1">
          {todo.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No open tasks. Add one from the Tasks page.
            </p>
          )}
          {todo.map((task) => (
            <div key={task.id} className="flex items-center gap-3 py-1.5">
              <Checkbox onCheckedChange={() => setStatus(task.id, "done")} />
              <span className="text-sm">{task.title}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
