import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refinePrompt } from "@/lib/anthropic/refine-prompt";
import { hasAnyKey, userKeyFromRequest } from "@/lib/anthropic/client";
import { parseJSON } from "@/lib/validation/parse";
import { RefinePromptSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJSON(request, RefinePromptSchema);
  if (parsed.error) return parsed.error;
  const { rawInput, originalPromptId } = parsed.data;

  const userKey = userKeyFromRequest(request);
  if (!hasAnyKey(userKey)) {
    return NextResponse.json(
      { error: "No Anthropic API key configured. Add one in Settings." },
      { status: 500 }
    );
  }

  try {
    const refined = await refinePrompt(rawInput, userKey);

    await supabase.from("prompt_block_refinements").insert({
      user_id: user.id,
      prompt_id: originalPromptId ?? null,
      block_type: "task",
      before: rawInput,
      after: refined,
    });

    return NextResponse.json({ refined });
  } catch (err) {
    console.error("refine-prompt failed", err);
    return NextResponse.json({ error: "Refinement failed" }, { status: 502 });
  }
}
