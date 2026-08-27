import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, firstText, COMPANION_MODEL } from "@/lib/anthropic/client";
import { getRecentNotes } from "@/lib/companion/context";

const SYSTEM_PROMPT = `Answer the question using ONLY the notes provided below. If the notes don't
contain an answer, say so plainly — don't guess or use outside knowledge. Keep it to 2-4
sentences. After your answer, on a new line, write "SOURCES: " followed by a comma-separated list
of the exact note titles you actually drew from (or "SOURCES: none" if you couldn't answer).`;

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

  const { question } = await request.json();
  if (!question || typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const notes = await getRecentNotes(supabase, user.id, 40);
  if (notes.length === 0) {
    return NextResponse.json({ answer: "You don't have any notes yet.", sources: [] });
  }

  const notesBlock = notes
    .map((n) => `### ${n.title}\n${n.body}`)
    .join("\n\n");

  try {
    const response = await getAnthropicClient().messages.create({
      model: COMPANION_MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT + `\n\nNotes:\n${notesBlock}`,
      messages: [{ role: "user", content: question }],
    });
    const text = firstText(response);
    const [answerPart, sourcesPart] = text.split(/\nSOURCES:\s*/i);
    const sources =
      sourcesPart && sourcesPart.trim().toLowerCase() !== "none"
        ? sourcesPart.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
    return NextResponse.json({ answer: answerPart.trim(), sources });
  } catch (err) {
    console.error("companion/ask-notes failed", err);
    return NextResponse.json({ error: "Couldn't search your notes right now" }, { status: 502 });
  }
}
