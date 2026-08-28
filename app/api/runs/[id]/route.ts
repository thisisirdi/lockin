import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseJSON } from "@/lib/validation/parse";
import { RunUpdateSchema } from "@/lib/validation/schemas";
import type { Database } from "@/lib/types/database";

type RunUpdate = Database["public"]["Tables"]["prompt_runs"]["Update"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJSON(request, RunUpdateSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const update: RunUpdate = {};
  if (body.output !== undefined) update.output = body.output;
  if (body.rating !== undefined) update.rating = body.rating;
  if (body.critiqueTags !== undefined) update.critique_tags = body.critiqueTags;

  const { data, error } = await supabase
    .from("prompt_runs")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ run: data });
}
