import { fetchJSON } from "@/lib/fetch-json";
import { useTimerStore } from "@/lib/store/timer";
import type { Task, Note, Prompt } from "@/lib/types";
import type { WindowId } from "@/lib/os/types";
import type { ContextChip } from "@/lib/store/companion";

export async function resolveWindowContext(id: WindowId): Promise<ContextChip | null> {
  switch (id) {
    case "tasks": {
      const { tasks } = await fetchJSON<{ tasks: Task[] }>("/api/tasks");
      const open = tasks.filter((t) => t.status === "todo");
      return {
        label: `Tasks · ${open.length} open`,
        text: `Open tasks (${open.length}): ${open.map((t) => t.title).join("; ") || "none"}`,
      };
    }
    case "notes": {
      const { notes } = await fetchJSON<{ notes: Note[] }>("/api/notes");
      const recent = notes.slice(0, 5);
      return {
        label: `Notes · ${notes.length} total`,
        text: recent.map((n) => `"${n.title}": ${n.body.slice(0, 200)}`).join("\n"),
      };
    }
    case "prompts": {
      const { prompts } = await fetchJSON<{ prompts: Prompt[] }>("/api/prompts");
      return {
        label: `Prompts · ${prompts.length} saved`,
        text: prompts
          .slice(0, 5)
          .map((p) => `"${p.title}": ${p.body.slice(0, 150)}`)
          .join("\n"),
      };
    }
    case "freedom": {
      const res = await fetchJSON<{
        goal: { monthly_revenue_goal: number; currency: string } | null;
        project: { name: string } | null;
      }>("/api/freedom-goal");
      if (!res.goal) return { label: "Freedom Goal", text: "No freedom goal set yet." };
      return {
        label: `Goal · ${res.project?.name ?? "Freedom Goal"}`,
        text: `Freedom goal: ${res.project?.name ?? "unnamed"}, target ${res.goal.currency} ${res.goal.monthly_revenue_goal}/month.`,
      };
    }
    case "timer": {
      const t = useTimerStore.getState();
      if (t.status === "idle") return { label: "Timer · idle", text: "No timer currently running." };
      const minutes = Math.round(t.elapsedSeconds() / 60);
      return {
        label: `Timer · ${minutes}m ${t.status}`,
        text: `Current session: ${minutes} minutes elapsed, mode ${t.mode}, status ${t.status}.`,
      };
    }
    default:
      return null;
  }
}
