import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolvePrompt } from "@/lib/studio/resolve";
import { parseJSON } from "@/lib/validation/parse";
import { VersionCreateSchema } from "@/lib/validation/schemas";

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

  const { data, error } = await supabase
    .from("prompt_versions")
    .select("*")
    .eq("prompt_id", id)
    .order("version_no", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ versions: data });
}

/** Creates an immutable version and promotes it to current — Studio has no separate promote UI yet. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJSON(request, VersionCreateSchema);
  if (parsed.error) return parsed.error;
  const { blocks, variables, changeNote, createdFromRunId } = parsed.data;

  const { data: latest } = await supabase
    .from("prompt_versions")
    .select("version_no")
    .eq("prompt_id", id)
    .order("version_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  const versionNo = (latest?.version_no ?? 0) + 1;

  const { data: version, error: versionError } = await supabase
    .from("prompt_versions")
    .insert({
      prompt_id: id,
      version_no: versionNo,
      blocks,
      variables: variables ?? [],
      change_note: changeNote ?? null,
      created_from_run_id: createdFromRunId ?? null,
    })
    .select()
    .single();

  if (versionError) return NextResponse.json({ error: versionError.message }, { status: 500 });

  const { resolvedPrompt } = resolvePrompt({ blocks, variables });

  const { data: prompt, error: promptError } = await supabase
    .from("prompts")
    .update({ current_version_id: version.id, body: resolvedPrompt })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (promptError) return NextResponse.json({ error: promptError.message }, { status: 500 });

  return NextResponse.json({ version, prompt }, { status: 201 });
}
