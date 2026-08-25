import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Number(searchParams.get("limit") ?? 100);

  let query = supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (from) query = query.gte("started_at", from);
  if (to) query = query.lte("started_at", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    categoryId,
    projectId,
    taskId,
    mode,
    startedAt,
    endedAt,
    durationSeconds,
    status,
  } = body;

  if (!mode || !startedAt || !endedAt || durationSeconds == null || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      category_id: categoryId ?? null,
      project_id: projectId ?? null,
      task_id: taskId ?? null,
      mode,
      started_at: startedAt,
      ended_at: endedAt,
      duration_seconds: Math.round(durationSeconds),
      status,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (taskId && status === "completed") {
    await supabase.from("tasks").update({ session_id: data.id }).eq("id", taskId);
  }

  return NextResponse.json({ session: data }, { status: 201 });
}
