import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { estimateTokens } from "@/lib/studio/resolve";
import { parseJSON } from "@/lib/validation/parse";
import { ContextBlockUpdateSchema } from "@/lib/validation/schemas";
import type { Database } from "@/lib/types/database";

type ContextBlockUpdate = Database["public"]["Tables"]["context_blocks"]["Update"];

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

  const parsed = await parseJSON(request, ContextBlockUpdateSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const update: ContextBlockUpdate = {};
  if (body.kind !== undefined) update.kind = body.kind;
  if (body.name !== undefined) update.name = body.name;
  if (body.body !== undefined) {
    update.body = body.body;
    update.token_estimate = estimateTokens(body.body);
  }
  if (body.archived !== undefined) update.archived_at = body.archived ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("context_blocks")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contextBlock: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("context_blocks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
