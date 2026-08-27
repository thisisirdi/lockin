import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, firstText, COMPANION_MODEL } from "@/lib/anthropic/client";

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

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  const { message, history, context } = await request.json();
  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const contextBlock: string =
    Array.isArray(context) && context.length > 0
      ? `\n\nAttached context:\n${context.map((c: string) => `- ${c}`).join("\n")}`
      : "";

  const historyMessages = (Array.isArray(history) ? history : [])
    .slice(-10)
    .map((m: { role: "user" | "assistant"; content: string }) => ({
      role: m.role,
      content: m.content,
    }));

  try {
    const response = await getAnthropicClient().messages.create({
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
