import { DOCK_CLEARANCE } from "@/lib/os/snap";

const CASCADE_STEP = 28;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** First position where `size` doesn't overlap any rect in `occupied`, cascading diagonally if the default spot is cluttered. */
export function findFreeSpot(
  occupied: Rect[],
  size: { w: number; h: number },
  stage: { width: number; height: number }
): { x: number; y: number } {
  const maxX = Math.max(12, stage.width - size.w - 12);
  const maxY = Math.max(8, stage.height - size.h - DOCK_CLEARANCE - 12);
  let x = 12;
  let y = 8;

  for (let attempt = 0; attempt < 80; attempt++) {
    const candidate: Rect = { x: Math.min(x, maxX), y: Math.min(y, maxY), w: size.w, h: size.h };
    if (!occupied.some((o) => rectsOverlap(candidate, o))) return { x: candidate.x, y: candidate.y };
    x += CASCADE_STEP;
    y += CASCADE_STEP;
    if (x > maxX) x = 12;
    if (y > maxY) y = 8;
  }
  return { x: Math.min(x, maxX), y: Math.min(y, maxY) };
}
