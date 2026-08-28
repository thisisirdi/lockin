import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { diffBlocks } from "@/lib/studio/diff";
import type { PromptBlock } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; a: string; b: string }> }
) {
  const { id, a, b } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: versions, error } = await supabase
    .from("prompt_versions")
    .select("id, version_no, blocks")
    .eq("prompt_id", id)
    .in("id", [a, b]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const versionA = versions?.find((v) => v.id === a);
  const versionB = versions?.find((v) => v.id === b);
  if (!versionA || !versionB) {
    return NextResponse.json({ error: "One or both versions were not found" }, { status: 404 });
  }

  const entries = diffBlocks(versionA.blocks as PromptBlock[], versionB.blocks as PromptBlock[]);

  return NextResponse.json({
    a: { id: versionA.id, versionNo: versionA.version_no },
    b: { id: versionB.id, versionNo: versionB.version_no },
    entries,
  });
}
