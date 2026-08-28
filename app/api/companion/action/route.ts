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
import { parseJSON } from "@/lib/validation/parse";
import { CompanionActionSchema } from "@/lib/validation/schemas";

const PLAN_SYSTEM_PROMPT = `You plan focused work blocks for the rest of today from a real task list.
Respond with ONLY a JSON array (no markdown fences, no prose) of 3-6 items, each shaped as:
{"time": "HH:MM", "title": string, "minutes": number, "note": string, "startable": boolean}

Rules: use only the tasks given, don't invent new ones. Include at least one short break between
work blocks. "startable" is true only for real task blocks (not breaks/lunch). Keep "note" under
12 words. Base the first block's time on the current time provided.`;

const BREAKDOWN_SYSTEM_PROMPT = `Break a vague task into 3-5 small, concrete first steps, ordered so
the first one is genuinely the smallest possible starting action (under 15 minutes). Respond with
ONLY a JSON array of strings (no markdown fences, no prose). Each string is one step, imperative
and specific — no generic filler like "plan the approach."`;

const UNSTICK_SYSTEM_PROMPT = `Given one task title, name the single smallest, most concrete literal
first action to open it — something doable in under 2 minutes with zero decisions left in it
(e.g. "Open the file and read the first function" not "start working on it"). One sentence, no
preamble.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJSON(request, CompanionActionSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const userKey = userKeyFromRequest(request);

  if (body.action === "plan") {
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
        system: PLAN_SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(input) }],
      });
      const blocks = JSON.parse(firstText(response));
      return NextResponse.json({ blocks });
    } catch (err) {
      console.error("companion/action(plan) failed", err);
      return NextResponse.json({ error: "Couldn't build a plan right now" }, { status: 502 });
    }
  }

  if (body.action === "breakdown") {
    if (!hasAnyKey(userKey)) {
      return NextResponse.json(
        { error: "No Anthropic API key configured. Add one in Settings." },
        { status: 500 }
      );
    }

    try {
      const response = await getAnthropicClient(userKey).messages.create({
        model: COMPANION_MODEL,
        max_tokens: 512,
        system: BREAKDOWN_SYSTEM_PROMPT,
        messages: [{ role: "user", content: body.title }],
      });
      const steps = JSON.parse(firstText(response));
      return NextResponse.json({ steps });
    } catch (err) {
      console.error("companion/action(breakdown) failed", err);
      return NextResponse.json({ error: "Couldn't break that down right now" }, { status: 502 });
    }
  }

  // action === "unstick-smallest"
  const tasks = await getOpenTasks(supabase, user.id, 1);
  if (tasks.length === 0) {
    return NextResponse.json({
      suggestion: "You don't have any open tasks — add one, then come back here.",
      taskTitle: null,
    });
  }

  const task = tasks[0];
  if (!hasAnyKey(userKey)) {
    return NextResponse.json({
      suggestion: `Open "${task.title}" and just look at it for a minute. That's the whole step.`,
      taskTitle: task.title,
    });
  }

  try {
    const response = await getAnthropicClient(userKey).messages.create({
      model: COMPANION_MODEL,
      max_tokens: 150,
      system: UNSTICK_SYSTEM_PROMPT,
      messages: [{ role: "user", content: task.title }],
    });
    return NextResponse.json({ suggestion: firstText(response), taskTitle: task.title });
  } catch (err) {
    console.error("companion/action(unstick-smallest) failed", err);
    return NextResponse.json({
      suggestion: `Open "${task.title}" and just look at it for a minute. That's the whole step.`,
      taskTitle: task.title,
    });
  }
}
