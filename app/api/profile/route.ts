import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import { parseJSON } from "@/lib/validation/parse";
import { ProfileUpdateSchema } from "@/lib/validation/schemas";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJSON(request, ProfileUpdateSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const update: ProfileUpdate = {};
  if (body.pomodoroSettings !== undefined) update.pomodoro_settings = body.pomodoroSettings;
  if (body.roomSettings !== undefined) update.room_settings = body.roomSettings;
  if (body.minSessionMinutesForStreak !== undefined)
    update.min_session_minutes_for_streak = body.minSessionMinutesForStreak;
  if (body.displayName !== undefined) update.display_name = body.displayName;
  if (body.timezone !== undefined) update.timezone = body.timezone;

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
