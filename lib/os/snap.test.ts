import { describe, it, expect } from "vitest";
import { snapToGrid, snapSingleEdge, snapPosition, SNAP_THRESHOLD } from "@/lib/os/snap";

describe("snapToGrid", () => {
  it("rounds to the nearest grid line", () => {
    expect(snapToGrid(24)).toBe(20);
    expect(snapToGrid(31)).toBe(40);
    expect(snapToGrid(0)).toBe(0);
  });

  it("respects a custom grid size", () => {
    expect(snapToGrid(14, 10)).toBe(10);
    expect(snapToGrid(16, 10)).toBe(20);
  });
});

describe("snapSingleEdge", () => {
  it("snaps to the closest target within the threshold", () => {
    const targets = [100, 300];
    expect(snapSingleEdge(103, targets)).toBe(100);
    expect(snapSingleEdge(296, targets)).toBe(300);
  });

  it("picks the nearer of two targets both within threshold", () => {
    expect(snapSingleEdge(101, [95, 105])).toBe(105);
  });

  it("falls back to grid rounding when nothing is close enough", () => {
    expect(snapSingleEdge(214, [100])).toBe(snapToGrid(214));
  });

  it("respects a custom threshold", () => {
    expect(snapSingleEdge(110, [100], 5)).toBe(snapToGrid(110));
    expect(snapSingleEdge(104, [100], 5)).toBe(100);
  });

  it("boundary distance exactly at the threshold still snaps", () => {
    expect(snapSingleEdge(100 + SNAP_THRESHOLD, [100])).toBe(100);
  });
});

describe("snapPosition", () => {
  it("snaps the leading edge to a target", () => {
    expect(snapPosition(103, 200, [100])).toBe(100);
  });

  it("snaps the trailing edge to a target, offsetting the leading edge", () => {
    // leading edge 296 doesn't match, but trailing edge (296+200=496) is close to 500
    expect(snapPosition(296, 200, [500])).toBe(300);
  });

  it("prefers the leading-edge snap over the trailing-edge snap", () => {
    // both a leading match at 100 and a trailing match near 100+size are plausible;
    // leading-edge candidates are checked first.
    expect(snapPosition(101, 50, [100])).toBe(100);
  });

  it("falls back to grid rounding when no target is close", () => {
    expect(snapPosition(214, 50, [1000])).toBe(snapToGrid(214));
  });
});
