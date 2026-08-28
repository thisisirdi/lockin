import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseJSON } from "@/lib/validation/parse";
import { RunCreateSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJSON(request, RunCreateSchema);
  if (parsed.error) return parsed.error;
  const { promptVersionId, model, variableValues, resolvedPrompt } = parsed.data;

  const { data, error } = await supabase
    .from("prompt_runs")
    .insert({
      user_id: user.id,
      prompt_version_id: promptVersionId,
      model: model ?? null,
      variable_values: variableValues ?? {},
      resolved_prompt: resolvedPrompt,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ run: data }, { status: 201 });
}
