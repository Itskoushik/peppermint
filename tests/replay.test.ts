import { describe, it, expect } from "vitest";
import { advanceReplay } from "../src/hooks/useReplay";
import type { RobotEvent } from "../src/types/fleet";

function makeEvent(t: number, robotId: string): RobotEvent {
  return { t, robot_id: robotId, x: 0, y: 0, status: "idle", battery: 100 };
}

describe("advanceReplay", () => {
  it("returns nothing when toTime hasn't reached the first event", () => {
    const events = [makeEvent(5, "r1"), makeEvent(10, "r1")];
    const { dueEvents, nextPointer } = advanceReplay(events, 0, 2);
    expect(dueEvents).toEqual([]);
    expect(nextPointer).toBe(0);
  });

  it("returns events in chronological order as time advances", () => {
    const events = [
      makeEvent(0, "r1"),
      makeEvent(5, "r1"),
      makeEvent(10, "r1"),
      makeEvent(15, "r1"),
    ];
    const { dueEvents, nextPointer } = advanceReplay(events, 0, 12);
    expect(dueEvents.map((e) => e.t)).toEqual([0, 5, 10]);
    expect(nextPointer).toBe(3);
  });

  it("drains multiple events sharing the same timestamp together", () => {
    // Mirrors the real data: all 8 robots report at every t.
    const events = [
      makeEvent(0, "r1"),
      makeEvent(0, "r2"),
      makeEvent(0, "r3"),
      makeEvent(5, "r1"),
      makeEvent(5, "r2"),
      makeEvent(5, "r3"),
    ];
    const { dueEvents, nextPointer } = advanceReplay(events, 0, 0);
    expect(dueEvents).toHaveLength(3);
    expect(dueEvents.every((e) => e.t === 0)).toBe(true);
    expect(nextPointer).toBe(3);
  });

  it("resumes correctly from a non-zero pointer", () => {
    const events = [
      makeEvent(0, "r1"),
      makeEvent(5, "r1"),
      makeEvent(10, "r1"),
      makeEvent(15, "r1"),
    ];
    // Simulate having already consumed the first two events.
    const { dueEvents, nextPointer } = advanceReplay(events, 2, 15);
    expect(dueEvents.map((e) => e.t)).toEqual([10, 15]);
    expect(nextPointer).toBe(4);
  });

  it("does not read past the end of the array once fully drained", () => {
    const events = [makeEvent(0, "r1"), makeEvent(5, "r1")];
    const { dueEvents, nextPointer } = advanceReplay(events, 2, 1000);
    expect(dueEvents).toEqual([]);
    expect(nextPointer).toBe(2);
  });

  it("includes an event exactly at toTime (inclusive boundary)", () => {
    const events = [makeEvent(5, "r1"), makeEvent(10, "r1")];
    const { dueEvents, nextPointer } = advanceReplay(events, 0, 5);
    expect(dueEvents.map((e) => e.t)).toEqual([5]);
    expect(nextPointer).toBe(1);
  });

  it("handles an empty events array without error", () => {
    const { dueEvents, nextPointer } = advanceReplay([], 0, 100);
    expect(dueEvents).toEqual([]);
    expect(nextPointer).toBe(0);
  });
});