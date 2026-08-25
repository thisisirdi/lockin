"use client";

import { useEffect, useState } from "react";
import { fetchJSON } from "@/lib/fetch-json";
import { useCategories } from "@/lib/hooks/use-categories";
import type { FreedomGoal, Project, Session } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { startOfMonth } from "date-fns";
import { toast } from "sonner";
import { Target } from "lucide-react";

interface GoalResponse {
  goal: FreedomGoal | null;
  project: Project | null;
  categories: string[];
}

const STEPS = ["Revenue goal", "Project", "Link categories"] as const;

export default function FreedomPage() {
  const [data, setData] = useState<GoalResponse | null>(null);
  const [monthHours, setMonthHours] = useState<number | null>(null);
  const { categories } = useCategories();

  const [step, setStep] = useState(0);
  const [monthlyRevenueGoal, setMonthlyRevenueGoal] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchJSON<GoalResponse>("/api/freedom-goal").then(setData);
  }, []);

  useEffect(() => {
    if (!data?.goal || data.categories.length === 0) return;
    fetchJSON<{ sessions: Session[] }>(
      `/api/sessions?from=${startOfMonth(new Date()).toISOString()}`
    ).then(({ sessions }) => {
      const seconds = sessions
        .filter(
          (s) => s.status === "completed" && data.categories.includes(s.category_id ?? "")
        )
        .reduce((sum, s) => sum + s.duration_seconds, 0);
      setMonthHours(seconds / 3600);
    });
  }, [data]);

  async function submit() {
    setCreating(true);
    try {
      const { goal, project } = await fetchJSON<{ goal: FreedomGoal; project: Project }>(
        "/api/freedom-goal",
        {
          method: "POST",
          body: JSON.stringify({
            monthlyRevenueGoal: Number(monthlyRevenueGoal),
            projectName,
            projectUrl,
            categoryIds: selectedCategories,
          }),
        }
      );
      setData({ goal, project, categories: selectedCategories });
      toast.success("Freedom goal set");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setCreating(false);
    }
  }

  if (data?.goal) {
    const target = data.goal.monthly_revenue_goal;
    const progressPct =
      monthHours !== null ? Math.min(100, (monthHours / 40) * 100) : 0; // rough visual scale

    return (
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold">Freedom Goal</h1>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              {data.project?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-semibold">
                {monthHours !== null ? monthHours.toFixed(1) : "…"}h
              </span>
              <span className="text-sm text-muted-foreground">
                logged this month toward{" "}
                <span className="font-medium text-foreground">
                  {data.goal.currency} {target.toLocaleString()}
                </span>
                /mo
              </span>
            </div>
            <Progress value={progressPct} />
            <p className="text-xs text-muted-foreground">
              v1 tracks hours invested against linked categories, not revenue directly —
              manual revenue logging arrives in v2.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Set your Freedom Goal</h1>
      <div className="flex gap-1.5 text-xs text-muted-foreground">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={i === step ? "font-medium text-foreground" : undefined}
          >
            {i + 1}. {s}
            {i < STEPS.length - 1 && <span className="mx-1.5">›</span>}
          </span>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {step === 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="goal">Monthly revenue goal (USD)</Label>
              <Input
                id="goal"
                type="number"
                placeholder="10000"
                value={monthlyRevenueGoal}
                onChange={(e) => setMonthlyRevenueGoal(e.target.value)}
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="project-url">Project URL (optional)</Label>
                <Input
                  id="project-url"
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <Label>Which categories count toward this goal?</Label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => {
                  const active = selectedCategories.includes(c.id);
                  return (
                    <Badge
                      key={c.id}
                      variant={active ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        setSelectedCategories((prev) =>
                          active ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                        )
                      }
                    >
                      {c.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 0 && !monthlyRevenueGoal) ||
                  (step === 1 && !projectName.trim())
                }
              >
                Next
              </Button>
            ) : (
              <Button onClick={submit} disabled={creating}>
                Finish
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
