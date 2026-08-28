import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAnthropicClient,
  firstText,
  COMPANION_MODEL,
  userKeyFromRequest,
} from "@/lib/anthropic/client";
import { getOpenTasks } from "@/lib/companion/context";

const SYSTEM_PROMPT = `Given one task title, name the single smallest, most concrete literal
first action to open it — something doable in under 2 minutes with zero decisions left in it
(e.g. "Open the file and read the first function" not "start working on it"). One sentence, no
preamble.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await getOpenTasks(supabase, user.id, 1);
  if (tasks.length === 0) {
    return NextResponse.json({
      suggestion: "You don't have any open tasks — add one, then come back here.",
      taskTitle: null,
    });
  }

  const task = tasks[0];
  const userKey = userKeyFromRequest(request);
  if (!userKey && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      suggestion: `Open "${task.title}" and just look at it for a minute. That's the whole step.`,
      taskTitle: task.title,
    });
  }

  try {
    const response = await getAnthropicClient(userKey).messages.create({
      model: COMPANION_MODEL,
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: task.title }],
    });
    return NextResponse.json({ suggestion: firstText(response), taskTitle: task.title });
  } catch (err) {
    console.error("companion/unstick-smallest failed", err);
    return NextResponse.json({
      suggestion: `Open "${task.title}" and just look at it for a minute. That's the whole step.`,
      taskTitle: task.title,
    });
  }
}
