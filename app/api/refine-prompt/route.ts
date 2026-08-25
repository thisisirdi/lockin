import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refinePrompt } from "@/lib/anthropic/refine-prompt";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rawInput, originalPromptId } = await request.json();
  if (!rawInput || typeof rawInput !== "string" || !rawInput.trim()) {
    return NextResponse.json({ error: "rawInput is required" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  try {
    const refined = await refinePrompt(rawInput);

    const { data, error } = await supabase
      .from("prompt_refinements")
      .insert({
        user_id: user.id,
        original_prompt_id: originalPromptId ?? null,
        raw_input: rawInput,
        refined_output: refined,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ refined, refinement: data });
  } catch (err) {
    console.error("refine-prompt failed", err);
    return NextResponse.json({ error: "Refinement failed" }, { status: 502 });
  }
}
