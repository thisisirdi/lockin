import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { estimateTokens } from "@/lib/studio/resolve";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("title, body")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (noteError) return NextResponse.json({ error: noteError.message }, { status: 404 });

  const { data, error } = await supabase
    .from("context_blocks")
    .insert({
      user_id: user.id,
      kind: "snippet",
      name: note.title,
      body: note.body,
      token_estimate: estimateTokens(note.body),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contextBlock: data }, { status: 201 });
}
