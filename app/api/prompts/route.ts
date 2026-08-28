import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseJSON } from "@/lib/validation/parse";
import { PromptCreateSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");

  let query = supabase
    .from("prompts")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (tag) query = query.contains("tags", [tag]);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prompts: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJSON(request, PromptCreateSchema);
  if (parsed.error) return parsed.error;
  const { title, body, tags, description, deliverableType, frameworkId } = parsed.data;

  const { data, error } = await supabase
    .from("prompts")
    .insert({
      user_id: user.id,
      title,
      body,
      tags: tags ?? [],
      description: description ?? null,
      deliverable_type: deliverableType ?? null,
      framework_id: frameworkId ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prompt: data }, { status: 201 });
}
