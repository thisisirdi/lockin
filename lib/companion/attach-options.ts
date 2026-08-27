import { fetchJSON } from "@/lib/fetch-json";
import type { Task, Note, Session } from "@/lib/types";
import type { ContextChip } from "@/lib/store/companion";

export type AttachOption = ContextChip;

export async function fetchAttachOptions(): Promise<AttachOption[]> {
  const [tasksRes, notesRes, sessionsRes, goalRes] = await Promise.all([
    fetchJSON<{ tasks: Task[] }>("/api/tasks").catch(() => ({ tasks: [] })),
    fetchJSON<{ notes: Note[] }>("/api/notes").catch(() => ({ notes: [] })),
    fetchJSON<{ sessions: Session[] }>("/api/sessions?limit=1").catch(() => ({ sessions: [] })),
    fetchJSON<{ goal: { monthly_revenue_goal: number; currency: string } | null; project: { name: string } | null }>(
      "/api/freedom-goal"
    ).catch(() => ({ goal: null, project: null })),
  ]);

  const options: AttachOption[] = [];

  const lastTask = tasksRes.tasks.find((t) => t.status === "todo");
  if (lastTask) {
    options.push({
      label: `Task · ${lastTask.title}`,
      text: `Open task: "${lastTask.title}" (type: ${lastTask.type})`,
    });
  }

  const lastNote = notesRes.notes[0];
  if (lastNote) {
    options.push({
      label: `Note · ${lastNote.title}`,
      text: `Note "${lastNote.title}": ${lastNote.body.slice(0, 500)}`,
    });
  }

  const lastSession = sessionsRes.sessions[0];
  if (lastSession) {
    const minutes = Math.round(lastSession.duration_seconds / 60);
    options.push({
      label: `Session · ${minutes}m ${new Date(lastSession.started_at).toLocaleDateString()}`,
      text: `Most recent session: ${minutes} minutes, mode ${lastSession.mode}, status ${lastSession.status}.`,
    });
  }

  if (goalRes.goal) {
    options.push({
      label: `Goal · ${goalRes.project?.name ?? "Freedom Goal"}`,
      text: `Freedom goal: ${goalRes.project?.name ?? "unnamed project"}, target ${goalRes.goal.currency} ${goalRes.goal.monthly_revenue_goal}/month.`,
    });
  }

  return options;
}
