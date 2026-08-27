import { getAnthropicClient, firstText, COMPANION_MODEL } from "@/lib/anthropic/client";

const SYSTEM_PROMPT = `You are a prompt engineering assistant embedded in a personal productivity app.
The user will paste a rough, underspecified prompt they intend to send to an AI model.

Rewrite it into a clear, well-structured prompt: state the task explicitly, specify the desired
output format, add any obviously-missing constraints (audience, length, tone) without inventing
facts the user didn't imply, and remove ambiguity. Keep the user's original intent and voice —
do not pad it with generic filler.

Respond with ONLY the refined prompt text. No preamble, no markdown fences, no explanation.`;

export async function refinePrompt(rawInput: string): Promise<string> {
  const message = await getAnthropicClient().messages.create({
    model: COMPANION_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: rawInput }],
  });
  return firstText(message);
}
