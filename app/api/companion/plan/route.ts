import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAnthropicClient,
  firstText,
  COMPANION_MODEL,
  hasAnyKey,
  userKeyFromRequest,
} from "@/lib/anthropic/client";
import { getOpenTasks, getFreedomGoalSummary } from "@/lib/companion/context";

const SYSTEM_PROMPT = `You plan focused work blocks for the rest of today from a real task list.
Respond with ONLY a JSON array (no markdown fences, no prose) of 3-6 items, each shaped as:
{"time": "HH:MM", "title": string, "minutes": number, "note": string, "startable": boolean}

Rules: use only the tasks given, don't invent new ones. Include at least one short break between
work blocks. "startable" is true only for real task blocks (not breaks/lunch). Keep "note" under
12 words. Base the first block's time on the current time provided.`;

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

  const [tasks, goal] = await Promise.all([
    getOpenTasks(supabase, user.id, 10),
    getFreedomGoalSummary(supabase, user.id),
  ]);

  if (tasks.length === 0) {
    return NextResponse.json({
      blocks: [],
      message: "No open tasks to plan around — add a few in Tasks first.",
    });
  }

  const now = new Date();
  const input = {
    currentTime: now.toTimeString().slice(0, 5),
    tasks: tasks.map((t) => ({ id: t.id, title: t.title, type: t.type })),
    goal: goal ? `${goal.projectName ?? "goal"}: ${goal.currency} ${goal.monthlyRevenueGoal}/mo` : null,
  };

  try {
    const response = await getAnthropicClient(userKey).messages.create({
      model: COMPANION_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(input) }],
    });
    const text = firstText(response);
    const blocks = JSON.parse(text);
    return NextResponse.json({ blocks });
  } catch (err) {
    console.error("companion/plan failed", err);
    return NextResponse.json({ error: "Couldn't build a plan right now" }, { status: 502 });
  }
}
