import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: versions, error: versionsError } = await supabase
    .from("prompt_versions")
    .select("id")
    .eq("prompt_id", id);

  if (versionsError) return NextResponse.json({ error: versionsError.message }, { status: 500 });
  const versionIds = (versions ?? []).map((v) => v.id);
  if (versionIds.length === 0) return NextResponse.json({ runs: [] });

  const { data, error } = await supabase
    .from("prompt_runs")
    .select("*")
    .in("prompt_version_id", versionIds)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ runs: data });
}
