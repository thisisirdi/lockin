import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeDailyMinutes, computeStreak } from "@/lib/streak";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, min_session_minutes_for_streak")
    .eq("user_id", user.id)
    .single();

  const timezone = profile?.timezone ?? "UTC";
  const minMinutes = profile?.min_session_minutes_for_streak ?? 15;

  const yearAgo = new Date();
  yearAgo.setDate(yearAgo.getDate() - 370);

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("started_at, duration_seconds, status")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("started_at", yearAgo.toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const dailyMinutes = computeDailyMinutes(sessions ?? [], timezone);
  const streak = computeStreak(dailyMinutes, minMinutes, timezone);

  return NextResponse.json({
    streak,
    minMinutes,
    timezone,
    dailyMinutes: Object.fromEntries(dailyMinutes),
  });
}
