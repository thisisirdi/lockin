import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

export async function getOpenTasks(supabase: Client, userId: string, limit = 20) {
  const { data } = await supabase
    .from("tasks")
    .select("id, title, type, created_at")
    .eq("user_id", userId)
    .eq("status", "todo")
    .order("created_at", { ascending: true })
    .limit(limit);
  return data ?? [];
}

export async function getFreedomGoalSummary(supabase: Client, userId: string) {
  const { data: goal } = await supabase
    .from("freedom_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!goal) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("freedom_goal_id", goal.id)
    .limit(1)
    .maybeSingle();

  return {
    monthlyRevenueGoal: goal.monthly_revenue_goal,
    currency: goal.currency,
    projectName: project?.name ?? null,
  };
}

export async function getRecentSessions(supabase: Client, userId: string, sinceDays: number) {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const { data } = await supabase
    .from("sessions")
    .select("started_at, duration_seconds, status, category_id")
    .eq("user_id", userId)
    .gte("started_at", since.toISOString())
    .order("started_at", { ascending: false });
  return data ?? [];
}

export async function getRecentNotes(supabase: Client, userId: string, limit = 30) {
  const { data } = await supabase
    .from("notes")
    .select("id, title, body, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
