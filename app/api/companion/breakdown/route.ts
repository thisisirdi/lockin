import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, firstText, COMPANION_MODEL } from "@/lib/anthropic/client";

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

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  const { title } = await request.json();
  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  try {
    const response = await getAnthropicClient().messages.create({
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
