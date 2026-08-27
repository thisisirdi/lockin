export const GRID = 20;
export const SNAP_THRESHOLD = 8;
export const STAGE_MARGIN = 16;
export const DOCK_CLEARANCE = 84;

export function snapToGrid(value: number, grid = GRID) {
  return Math.round(value / grid) * grid;
}

/**
 * Snaps a single moving edge (one side of a resize) to the closest target
 * within `threshold`, or grid-rounds it if nothing is close enough.
 */
export function snapSingleEdge(
  candidate: number,
  targets: number[],
  threshold = SNAP_THRESHOLD
): number {
  let best = candidate;
  let bestDist = threshold + 1;
  for (const t of targets) {
    const dist = Math.abs(candidate - t);
    if (dist < bestDist) {
      bestDist = dist;
      best = t;
    }
  }
  return bestDist <= threshold ? best : snapToGrid(candidate);
}

/**
 * Snaps a moving box's leading position along one axis (dragging, so both
 * edges move together): tries the leading edge against targets first, then
 * the trailing edge, else grid-rounds the leading edge.
 */
export function snapPosition(pos: number, size: number, targets: number[]): number {
  for (const t of targets) {
    if (Math.abs(pos - t) <= SNAP_THRESHOLD) return t;
  }
  for (const t of targets) {
    if (Math.abs(pos + size - t) <= SNAP_THRESHOLD) return t - size;
  }
  return snapToGrid(pos);
}

/** Stage-relative left/right/top/bottom edges of every other visible window. */
export function collectSnapTargets(
  stageEl: HTMLElement,
  selfId: string
): { xs: number[]; ys: number[] } {
  const stageRect = stageEl.getBoundingClientRect();
  const xs = [STAGE_MARGIN, stageRect.width - STAGE_MARGIN];
  const ys = [STAGE_MARGIN, stageRect.height - DOCK_CLEARANCE];

  stageEl.querySelectorAll("[data-os-window]").forEach((el) => {
    if (el.getAttribute("data-os-window") === selfId) return;
    const r = el.getBoundingClientRect();
    xs.push(r.left - stageRect.left, r.right - stageRect.left);
    ys.push(r.top - stageRect.top, r.bottom - stageRect.top);
  });

  return { xs, ys };
}
