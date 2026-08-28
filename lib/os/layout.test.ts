import { describe, it, expect } from "vitest";
import { rectsOverlap, findFreeSpot } from "@/lib/os/layout";

describe("rectsOverlap", () => {
  it("detects overlapping rects", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 100, h: 100 }, { x: 50, y: 50, w: 100, h: 100 })).toBe(true);
  });

  it("detects non-overlapping rects", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 100, h: 100 }, { x: 200, y: 0, w: 100, h: 100 })).toBe(false);
  });

  it("treats edge-touching rects as non-overlapping", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 100, h: 100 }, { x: 100, y: 0, w: 100, h: 100 })).toBe(false);
  });
});

describe("findFreeSpot", () => {
  const stage = { width: 1240, height: 780 };

  it("places the window at the top-left corner when nothing is occupied", () => {
    expect(findFreeSpot([], { w: 300, h: 200 }, stage)).toEqual({ x: 12, y: 8 });
  });

  it("cascades past a rect occupying the default corner", () => {
    const occupied = [{ x: 12, y: 8, w: 300, h: 200 }];
    const spot = findFreeSpot(occupied, { w: 300, h: 200 }, stage);
    expect(spot).not.toEqual({ x: 12, y: 8 });
    expect(rectsOverlap({ ...spot, w: 300, h: 200 }, occupied[0])).toBe(false);
  });

  it("never returns a spot that overlaps any occupied rect", () => {
    const occupied = [
      { x: 12, y: 8, w: 300, h: 200 },
      { x: 340, y: 8, w: 300, h: 200 },
      { x: 668, y: 8, w: 300, h: 200 },
    ];
    const spot = findFreeSpot(occupied, { w: 300, h: 200 }, stage);
    for (const o of occupied) {
      expect(rectsOverlap({ ...spot, w: 300, h: 200 }, o)).toBe(false);
    }
  });

  it("stays within the stage bounds even when fully cluttered", () => {
    const occupied: { x: number; y: number; w: number; h: number }[] = [];
    for (let x = 0; x < stage.width; x += 40) {
      for (let y = 0; y < stage.height; y += 40) {
        occupied.push({ x, y, w: 40, h: 40 });
      }
    }
    const spot = findFreeSpot(occupied, { w: 300, h: 200 }, stage);
    expect(spot.x).toBeGreaterThanOrEqual(0);
    expect(spot.x + 300).toBeLessThanOrEqual(stage.width);
    expect(spot.y).toBeGreaterThanOrEqual(0);
  });
});
