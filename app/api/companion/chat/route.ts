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
import { CompanionChatSchema } from "@/lib/validation/schemas";

const SYSTEM_PROMPT = `You are Companion, a quiet productivity assistant embedded in LockIn, a
personal deep-work timer app. The user is doing focused work and you are their sounding board —
terse, warm, never preachy. Default to 2-4 sentences unless asked for more.

You only know what's explicitly passed to you as context below — you have no other memory of
this user. If no context is attached and the question needs specifics you don't have, say so
plainly and ask them to attach a task, note, or session rather than guessing.

Never invent numbers, task names, or facts not present in the provided context.`;

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

  const parsed = await parseJSON(request, CompanionChatSchema);
  if (parsed.error) return parsed.error;
  const { message, history, context } = parsed.data;

  const contextBlock: string =
    context && context.length > 0
      ? `\n\nAttached context:\n${context.map((c) => `- ${c}`).join("\n")}`
      : "";

  const historyMessages = (history ?? []).slice(-10);

  try {
    const response = await getAnthropicClient(userKey).messages.create({
      model: COMPANION_MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT + contextBlock,
      messages: [...historyMessages, { role: "user", content: message }],
    });
    return NextResponse.json({ reply: firstText(response) });
  } catch (err) {
    console.error("companion/chat failed", err);
    return NextResponse.json({ error: "Companion is unavailable right now" }, { status: 502 });
  }
}
