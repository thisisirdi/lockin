"use client";

import { useMemo, useState } from "react";
import { useTasks } from "@/lib/hooks/use-tasks";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function TasksPage() {
  const { tasks, addTask, setStatus, removeTask, loading } = useTasks();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("General");

  const todo = useMemo(() => tasks.filter((t) => t.status === "todo"), [tasks]);
  const done = useMemo(() => tasks.filter((t) => t.status === "done"), [tasks]);
  const log = useMemo(
    () =>
      [...done].sort(
        (a, b) =>
          new Date(b.completed_at ?? b.created_at).getTime() -
          new Date(a.completed_at ?? a.created_at).getTime()
      ),
    [done]
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Tasks</h1>

      <Card>
        <CardContent className="pt-6">
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!title.trim()) return;
              await addTask(title.trim(), type.trim() || "General");
              setTitle("");
            }}
          >
            <Input
              placeholder="What are you working on?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-28"
            />
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="todo">
        <TabsList>
          <TabsTrigger value="todo">To-Do ({todo.length})</TabsTrigger>
          <TabsTrigger value="done">Done ({done.length})</TabsTrigger>
          <TabsTrigger value="log">Log</TabsTrigger>
        </TabsList>

        <TabsContent value="todo" className="space-y-2">
          {!loading && todo.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing on your plate. Add a task above.
            </p>
          )}
          {todo.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <Checkbox
                  checked={false}
                  onCheckedChange={() => setStatus(task.id, "done")}
                />
                <span className="flex-1">{task.title}</span>
                <Badge variant="secondary">{task.type}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTask(task.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="done" className="space-y-2">
          {done.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <Checkbox
                  checked
                  onCheckedChange={() => setStatus(task.id, "todo")}
                />
                <span className="flex-1 text-muted-foreground line-through">
                  {task.title}
                </span>
                <Badge variant="secondary">{task.type}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTask(task.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="log" className="space-y-2">
          {log.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between border-b border-border py-2 text-sm"
            >
              <span>{task.title}</span>
              <span className="text-muted-foreground">
                {task.completed_at
                  ? format(new Date(task.completed_at), "MMM d, h:mm a")
                  : "—"}
              </span>
            </div>
          ))}
          {log.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Completed tasks will show up here.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
