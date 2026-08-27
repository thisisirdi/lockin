import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, firstText, COMPANION_MODEL } from "@/lib/anthropic/client";
import { getRecentSessions } from "@/lib/companion/context";

const SYSTEM_PROMPT = `You write a short, honest weekly review for a deep-work app from real
numbers only — never invent a figure not given to you. 2-4 sentences, no preamble, no headers.
Note one real pattern (e.g. time-of-day skew, block length) if the data supports it, and end with
one concrete, low-effort suggestion. If the data is too thin to say anything specific, say that
plainly instead of padding.`;

function median(nums: number[]) {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await getRecentSessions(supabase, user.id, 7);
  const completed = sessions.filter((s) => s.status === "completed");

  const totalSeconds = completed.reduce((sum, s) => sum + s.duration_seconds, 0);
  const blockMinutes = completed.map((s) => s.duration_seconds / 60);
  const medianBlock = Math.round(median(blockMinutes));
  const morningCount = completed.filter((s) => new Date(s.started_at).getHours() < 11).length;

  const stats = {
    totalHours: Math.round((totalSeconds / 3600) * 10) / 10,
    sessionCount: completed.length,
    medianBlockMinutes: medianBlock,
    morningSessions: morningCount,
    afternoonSessions: completed.length - morningCount,
  };

  if (completed.length === 0) {
    return NextResponse.json({
      stats,
      insight: "No completed sessions in the last 7 days yet — nothing to review.",
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ stats, insight: null });
  }

  try {
    const response = await getAnthropicClient().messages.create({
      model: COMPANION_MODEL,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(stats) }],
    });
    return NextResponse.json({ stats, insight: firstText(response) });
  } catch (err) {
    console.error("companion/review failed", err);
    return NextResponse.json({ stats, insight: null });
  }
}
