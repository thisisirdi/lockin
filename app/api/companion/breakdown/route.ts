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
import { CompanionBreakdownSchema } from "@/lib/validation/schemas";

const SYSTEM_PROMPT = `Break a vague task into 3-5 small, concrete first steps, ordered so the
first one is genuinely the smallest possible starting action (under 15 minutes). Respond with
ONLY a JSON array of strings (no markdown fences, no prose). Each string is one step, imperative
and specific — no generic filler like "plan the approach."`;

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

  const parsed = await parseJSON(request, CompanionBreakdownSchema);
  if (parsed.error) return parsed.error;
  const { title } = parsed.data;

  try {
    const response = await getAnthropicClient(userKey).messages.create({
      model: COMPANION_MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: title }],
    });
    const steps = JSON.parse(firstText(response));
    return NextResponse.json({ steps });
  } catch (err) {
    console.error("companion/breakdown failed", err);
    return NextResponse.json({ error: "Couldn't break that down right now" }, { status: 502 });
  }
}
