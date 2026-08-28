import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { estimateTokens } from "@/lib/studio/resolve";
import { parseJSON } from "@/lib/validation/parse";
import { ContextBlockCreateSchema, ContextBlockKindSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const kind = ContextBlockKindSchema.safeParse(searchParams.get("kind"));

  let query = supabase
    .from("context_blocks")
    .select("*")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (kind.success) query = query.eq("kind", kind.data);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contextBlocks: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJSON(request, ContextBlockCreateSchema);
  if (parsed.error) return parsed.error;
  const { kind, name, body } = parsed.data;

  const { data, error } = await supabase
    .from("context_blocks")
    .insert({ user_id: user.id, kind, name, body, token_estimate: estimateTokens(body) })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contextBlock: data }, { status: 201 });
}
