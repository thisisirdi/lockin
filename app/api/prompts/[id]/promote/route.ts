import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolvePrompt } from "@/lib/studio/resolve";
import { parseJSON } from "@/lib/validation/parse";
import { PromoteVersionSchema } from "@/lib/validation/schemas";
import type { PromptBlock, PromptVariable } from "@/lib/types";

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

  const parsed = await parseJSON(request, PromoteVersionSchema);
  if (parsed.error) return parsed.error;
  const { versionId } = parsed.data;

  const { data: version, error: versionError } = await supabase
    .from("prompt_versions")
    .select("id, prompt_id, blocks, variables")
    .eq("id", versionId)
    .eq("prompt_id", id)
    .single();
  if (versionError) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const { resolvedPrompt } = resolvePrompt({
    blocks: version.blocks as PromptBlock[],
    variables: version.variables as PromptVariable[],
  });

  const { data: prompt, error } = await supabase
    .from("prompts")
    .update({ current_version_id: version.id, body: resolvedPrompt })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prompt });
}
