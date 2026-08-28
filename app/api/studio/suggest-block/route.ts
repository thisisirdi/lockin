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
import { SuggestBlockSchema } from "@/lib/validation/schemas";

const SYSTEM_PROMPT = `You suggest starting content for ONE empty block of a structured prompt,
based on the deliverable type and every block already locked before it.

Respond with ONLY a JSON array of exactly 3 short candidate strings (no markdown fences, no
prose). Each candidate is a complete, usable draft for that block alone — concrete, not generic
filler, grounded only in the deliverable type and locked blocks given. Never invent specifics
(names, numbers, tools) not implied by them.`;

export async function POST(request: NextRequest) {
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

  const parsed = await parseJSON(request, SuggestBlockSchema);
  if (parsed.error) return parsed.error;
  const { blockType, deliverableType, lockedBlocks } = parsed.data;

  const lockedSection =
    lockedBlocks.length > 0
      ? `\n\nBlocks already locked:\n${lockedBlocks.map((b) => `[${b.blockType}]\n${b.body}`).join("\n\n")}`
      : "\n\nNo blocks locked yet.";

  const userMessage = `Deliverable type: ${deliverableType ?? "unspecified"}\nBlock needing content: ${blockType}${lockedSection}`;

  try {
    const response = await getAnthropicClient(userKey).messages.create({
      model: COMPANION_MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    const candidates = JSON.parse(firstText(response));
    return NextResponse.json({ candidates });
  } catch (err) {
    console.error("studio/suggest-block failed", err);
    return NextResponse.json({ error: "Couldn't generate suggestions right now" }, { status: 502 });
  }
}
