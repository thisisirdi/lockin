import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAnthropicClient,
  COMPANION_MODEL,
  hasAnyKey,
  userKeyFromRequest,
} from "@/lib/anthropic/client";
import { parseJSON } from "@/lib/validation/parse";
import { RefineBlockSchema } from "@/lib/validation/schemas";
import { CHANGE_NOTE_MARKER } from "@/lib/anthropic/constants";

const SYSTEM_PROMPT = `You refine exactly ONE block of a structured prompt the user is composing,
piece by piece. You are given that block's draft and every block already locked before it.

Rules:
- Refine ONLY the block you were given. Never introduce facts absent from the draft or the
  locked blocks below. Never restate or rewrite the content of another block.
- Tighten wording, resolve ambiguity, make it concrete — keep the user's intent and voice.
- Output the refined block text, then on its own line the exact marker "${CHANGE_NOTE_MARKER}",
  then one short sentence (under 15 words) describing what changed.
- No preamble, no markdown fences, no explanation beyond that one sentence.`;

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

  const parsed = await parseJSON(request, RefineBlockSchema);
  if (parsed.error) return parsed.error;
  const { blockType, draft, deliverableType, lockedBlocks } = parsed.data;

  const lockedSection =
    lockedBlocks.length > 0
      ? `\n\nBlocks already locked:\n${lockedBlocks.map((b) => `[${b.blockType}]\n${b.body}`).join("\n\n")}`
      : "\n\nNo blocks locked yet.";

  const userMessage = `Deliverable type: ${deliverableType ?? "unspecified"}
Block to refine: ${blockType}
Draft:
${draft}${lockedSection}`;

  const anthropicStream = getAnthropicClient(userKey).messages.stream({
    model: COMPANION_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      anthropicStream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
      anthropicStream.on("end", () => controller.close());
      anthropicStream.on("error", (err) => {
        console.error("studio/refine-block stream failed", err);
        controller.error(err);
      });
    },
    cancel() {
      anthropicStream.abort();
    },
  });

  anthropicStream
    .finalText()
    .then((text) => {
      const [refined] = text.split(CHANGE_NOTE_MARKER);
      return supabase.from("prompt_block_refinements").insert({
        user_id: user.id,
        block_type: blockType,
        before: draft,
        after: refined.trim(),
      });
    })
    .catch(() => {});

  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
