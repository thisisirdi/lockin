import type { Session } from "@/lib/types";

export interface DailyTotal {
  date: string; // YYYY-MM-DD, in the user's local timezone
  minutes: number;
}

/** Groups completed sessions into per-local-day minute totals. */
export function computeDailyMinutes(
  sessions: Pick<Session, "started_at" | "duration_seconds" | "status">[],
  timezone: string
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const session of sessions) {
    if (session.status !== "completed") continue;
    const localDate = new Date(session.started_at).toLocaleDateString("en-CA", {
      timeZone: timezone,
    });
    const minutes = session.duration_seconds / 60;
    totals.set(localDate, (totals.get(localDate) ?? 0) + minutes);
  }
  return totals;
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Consecutive days (ending today or yesterday) meeting the minute threshold. */
export function computeStreak(
  dailyMinutes: Map<string, number>,
  minMinutes: number,
  timezone: string
): number {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  let cursor = today;
  let streak = 0;
  let first = true;

  while (true) {
    const minutes = dailyMinutes.get(cursor) ?? 0;
    if (minutes >= minMinutes) {
      streak += 1;
      cursor = shiftDate(cursor, -1);
    } else if (first) {
      // Today hasn't hit the threshold yet — don't break the streak, just
      // don't count it until it does.
      cursor = shiftDate(cursor, -1);
    } else {
      break;
    }
    first = false;
  }

  return streak;
}

export function bucketLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  const hours = minutes / 60;
  if (hours <= 0) return 0;
  if (hours < 1) return 1;
  if (hours < 2) return 2;
  if (hours < 4) return 3;
  return 4;
}
