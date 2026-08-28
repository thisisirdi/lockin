"use client";

import { useEffect, useState } from "react";
import { OSWindow } from "@/components/os/Window";
import { fetchJSON } from "@/lib/fetch-json";
import { useCategories } from "@/lib/hooks/use-categories";
import { useOSStore } from "@/lib/store/os";
import type { FreedomGoal, Project, Session } from "@/lib/types";
import { startOfMonth, startOfWeek } from "date-fns";
import { Target } from "lucide-react";
import { toast } from "sonner";

interface GoalResponse {
  goal: FreedomGoal | null;
  project: Project | null;
  categories: string[];
}

export function FreedomWindow({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const visible = useOSStore((s) => s.windows.freedom.visible);
  const [data, setData] = useState<GoalResponse | null>(null);
  const [monthHours, setMonthHours] = useState<number | null>(null);
  const [weekHours, setWeekHours] = useState<number | null>(null);
  const { categories } = useCategories(visible);
  const [goalInput, setGoalInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!visible) return;
    fetchJSON<GoalResponse>("/api/freedom-goal").then(setData);
  }, [visible]);

  useEffect(() => {
    if (!visible || !data?.goal) return;
    const linked = data.categories.length > 0 ? data.categories : categories.map((c) => c.id);
    fetchJSON<{ sessions: Session[] }>(
      `/api/sessions?from=${startOfMonth(new Date()).toISOString()}`
    ).then(({ sessions }) => {
      const completed = sessions.filter(
        (s) => s.status === "completed" && linked.includes(s.category_id ?? "")
      );
      const monthSeconds = completed.reduce((sum, s) => sum + s.duration_seconds, 0);
      const weekStart = startOfWeek(new Date());
      const weekSeconds = completed
        .filter((s) => new Date(s.started_at) >= weekStart)
        .reduce((sum, s) => sum + s.duration_seconds, 0);
      setMonthHours(monthSeconds / 3600);
      setWeekHours(weekSeconds / 3600);
    });
  }, [visible, data, categories]);

  async function submit() {
    if (!goalInput || !nameInput.trim()) return;
    setCreating(true);
    try {
      const { goal, project } = await fetchJSON<{ goal: FreedomGoal; project: Project }>(
        "/api/freedom-goal",
        {
          method: "POST",
          body: JSON.stringify({
            monthlyRevenueGoal: Number(goalInput),
            projectName: nameInput.trim(),
            categoryIds: categories.map((c) => c.id),
          }),
        }
      );
      setData({ goal, project, categories: categories.map((c) => c.id) });
      toast.success("Freedom goal set");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setCreating(false);
    }
  }

  const goal = data?.goal;
  const pct = goal && monthHours != null ? Math.min(100, (monthHours / 40) * 100) : 0;

  return (
    <OSWindow id="freedom" icon={<Target className="h-[13px] w-[13px]" strokeWidth={1.9} />} stageRef={stageRef}>
      <div className="flex flex-col gap-3 px-4 pb-4 pt-3.5">
        {!goal ? (
          <div className="flex flex-col gap-2">
            <div className="text-[13.5px]">Set a Freedom Goal</div>
            <input
              type="number"
              placeholder="Monthly revenue goal ($)"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className="h-8 rounded-[9px] border bg-transparent px-2.5 text-[13px] outline-none placeholder:text-white/35"
              style={{ borderColor: "var(--edge)" }}
            />
            <input
              placeholder="Project name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="h-8 rounded-[9px] border bg-transparent px-2.5 text-[13px] outline-none placeholder:text-white/35"
              style={{ borderColor: "var(--edge)" }}
            />
            <button
              onClick={submit}
              disabled={creating || !goalInput || !nameInput.trim()}
              className="h-8 rounded-[9px] bg-white/92 text-[13px] font-medium text-[#111214] disabled:opacity-50"
            >
              Set goal
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-0.5">
              <div className="text-[14.5px]">{data?.project?.name}</div>
              <div className="text-[12px]" style={{ color: "var(--dim)" }}>
                Everything you log rolls up here
              </div>
            </div>
            <div className="flex flex-col gap-[7px]">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[19px] tracking-[-0.01em]">
                  {monthHours != null ? monthHours.toFixed(0) : "…"}
                  <span style={{ color: "var(--dim2)" }}> h this month</span>
                </span>
                <span className="text-[12px]" style={{ color: "var(--dim)" }}>
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div className="h-[5px] overflow-hidden rounded-full bg-white/[0.13]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: "var(--accent)" }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 pt-0.5 text-[12.5px]">
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--dim)" }}>This week</span>
                <span className="font-mono">{weekHours?.toFixed(1) ?? "…"}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--dim)" }}>Goal</span>
                <span>${Number(goal.monthly_revenue_goal).toLocaleString()}/mo</span>
              </div>
            </div>
          </>
        )}
      </div>
    </OSWindow>
  );
}
