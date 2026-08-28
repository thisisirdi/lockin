import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAnthropicClient,
  firstText,
  COMPANION_MODEL,
  hasAnyKey,
  userKeyFromRequest,
} from "@/lib/anthropic/client";
import { parseJSON } from "@/lib/validation/parse";
import { PatchSuggestionSchema } from "@/lib/validation/schemas";
import { BLOCK_LABELS } from "@/lib/studio/constants";
import type { PromptBlock, BlockType } from "@/lib/types";

const SYSTEM_PROMPT = `You patch exactly ONE block of a structured prompt in response to feedback about a
run that used it. You are given the block's current text, a patch instruction describing the kind of
fix needed, and (if available) the output that prompted the complaint.

Rules:
- Patch ONLY the block you were given. Never touch or restate other blocks.
- Follow the patch instruction. Never invent facts not present in the block or the feedback.
- Output ONLY the patched block text. No preamble, no markdown fences, no explanation.`;

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

  const userKey = userKeyFromRequest(request);
  if (!hasAnyKey(userKey)) {
    return NextResponse.json(
      { error: "No Anthropic API key configured. Add one in Settings." },
      { status: 500 }
    );
  }

  const parsed = await parseJSON(request, PatchSuggestionSchema);
  if (parsed.error) return parsed.error;
  const { critiqueTag } = parsed.data;

  const { data: run, error: runError } = await supabase
    .from("prompt_runs")
    .select("id, output, prompt_version_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (runError) return NextResponse.json({ error: runError.message }, { status: 404 });

  const { data: mapping, error: mappingError } = await supabase
    .from("critique_mappings")
    .select("*")
    .eq("tag", critiqueTag)
    .single();
  if (mappingError) return NextResponse.json({ error: "Unknown critique tag" }, { status: 400 });

  const { data: version, error: versionError } = await supabase
    .from("prompt_versions")
    .select("blocks")
    .eq("id", run.prompt_version_id)
    .single();
  if (versionError) return NextResponse.json({ error: versionError.message }, { status: 404 });

  const blocks = version.blocks as PromptBlock[];
  const targetType = mapping.target_block_type as BlockType;
  const targetBlock = blocks.find((b) => b.block_type === targetType);
  if (!targetBlock) {
    return NextResponse.json(
      { error: `This prompt has no ${BLOCK_LABELS[targetType]} block to patch.` },
      { status: 400 }
    );
  }

  const userMessage = `Block type: ${targetType}
Current text:
${targetBlock.body}

Patch instruction: ${mapping.patch_instruction}
${run.output ? `\nOutput that prompted this feedback (truncated):\n${run.output.slice(0, 1000)}` : ""}`;

  try {
    const response = await getAnthropicClient(userKey).messages.create({
      model: COMPANION_MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    return NextResponse.json({
      blockType: targetType,
      before: targetBlock.body,
      after: firstText(response),
    });
  } catch (err) {
    console.error("runs/patch-suggestion failed", err);
    return NextResponse.json({ error: "Couldn't generate a patch right now" }, { status: 502 });
  }
}
