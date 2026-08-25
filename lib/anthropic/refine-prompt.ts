import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a prompt engineering assistant embedded in a personal productivity app.
The user will paste a rough, underspecified prompt they intend to send to an AI model.

Rewrite it into a clear, well-structured prompt: state the task explicitly, specify the desired
output format, add any obviously-missing constraints (audience, length, tone) without inventing
facts the user didn't imply, and remove ambiguity. Keep the user's original intent and voice —
do not pad it with generic filler.

Respond with ONLY the refined prompt text. No preamble, no markdown fences, no explanation.`;

let client: Anthropic | null = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function refinePrompt(rawInput: string): Promise<string> {
  const message = await getClient().messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: rawInput }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic API returned no text content");
  }
  return textBlock.text.trim();
}
