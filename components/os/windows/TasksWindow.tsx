"use client";

import { useMemo, useState } from "react";
import { OSWindow } from "@/components/os/Window";
import { useTasks } from "@/lib/hooks/use-tasks";
import { CheckSquare, Check } from "lucide-react";

export function TasksWindow({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const { tasks, addTask, setStatus } = useTasks();
  const [title, setTitle] = useState("");

  const todo = useMemo(() => tasks.filter((t) => t.status === "todo"), [tasks]);
  const done = useMemo(
    () => tasks.filter((t) => t.status === "done").slice(0, 3),
    [tasks]
  );

  return (
    <OSWindow id="tasks" icon={<CheckSquare className="h-[13px] w-[13px]" strokeWidth={1.9} />} stageRef={stageRef}>
      <div className="flex flex-col gap-2 px-3.5 pb-3.5 pt-3">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            await addTask(title.trim(), "General");
            setTitle("");
          }}
        >
          <input
            placeholder="Add a task…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 w-full rounded-[9px] border bg-transparent px-2.5 text-[13px] outline-none placeholder:text-white/35"
            style={{ borderColor: "var(--edge-soft)" }}
          />
        </form>

        <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {todo.map((t) => (
            <button
              key={t.id}
              onClick={() => setStatus(t.id, "done")}
              className="flex items-center gap-2.5 rounded-lg px-1 py-[7px] text-left hover:bg-white/[0.04]"
            >
              <span
                className="h-[15px] w-[15px] shrink-0 rounded-[5px] border"
                style={{ borderColor: "var(--edge)" }}
              />
              <span className="text-[13.5px]">{t.title}</span>
            </button>
          ))}
          {todo.length === 0 && (
            <p className="py-3 text-center text-[12.5px]" style={{ color: "var(--dim2)" }}>
              Nothing open.
            </p>
          )}
          {done.map((t) => (
            <button
              key={t.id}
              onClick={() => setStatus(t.id, "todo")}
              className="flex items-center gap-2.5 rounded-lg px-1 py-[7px] text-left opacity-45"
            >
              <span
                className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[5px] bg-white/50"
              >
                <Check className="h-2.5 w-2.5 text-[#111214]" strokeWidth={3} />
              </span>
              <span className="text-[13.5px] line-through">{t.title}</span>
            </button>
          ))}
        </div>
      </div>
    </OSWindow>
  );
}
