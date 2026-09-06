import { describe, it, expect } from "vitest";
import {
  needsAttention,
  attentionReason,
  computeTrendPoint,
  WORKING_STATUSES,
  ATTENTION_STATUSES,
} from "../src/lib/fleetMetrics";
import type { FleetState, RobotState } from "../src/types/fleet";

function makeRobot(overrides: Partial<RobotState> = {}): RobotState {
  return {
    robotId: "r1",
    robotType: "picker",
    x: 100,
    y: 100,
    status: "idle",
    battery: 80,
    lastUpdated: 0,
    ...overrides,
  };
}

describe("needsAttention", () => {
  it("flags each attention status", () => {
    for (const status of ATTENTION_STATUSES) {
      const robot = makeRobot({ status: status as RobotState["status"], battery: 90 });
      expect(needsAttention(robot)).toBe(true);
    }
  });

  it("does not flag a healthy working robot", () => {
    const robot = makeRobot({ status: "on_mission", battery: 80 });
    expect(needsAttention(robot)).toBe(false);
  });

  it("does not flag idle with good battery", () => {
    const robot = makeRobot({ status: "idle", battery: 80 });
    expect(needsAttention(robot)).toBe(false);
  });

  it("flags low battery even when status is otherwise fine", () => {
    const robot = makeRobot({ status: "active", battery: 15 });
    expect(needsAttention(robot)).toBe(true);
  });

  it("treats exactly the threshold as not-yet-low", () => {
    const robot = makeRobot({ status: "active", battery: 20 });
    expect(needsAttention(robot)).toBe(false);
  });
});

describe("attentionReason", () => {
  it("returns null when nothing is wrong", () => {
    const robot = makeRobot({ status: "active", battery: 90 });
    expect(attentionReason(robot)).toBeNull();
  });

  it("mentions status when status is the cause", () => {
    const robot = makeRobot({ status: "error", battery: 90 });
    expect(attentionReason(robot)).toContain("status: error");
  });

  it("mentions battery when battery is the cause", () => {
    const robot = makeRobot({ status: "idle", battery: 5 });
    expect(attentionReason(robot)).toContain("low battery");
  });

  it("mentions both when both apply", () => {
    const robot = makeRobot({ status: "blocked", battery: 5 });
    const reason = attentionReason(robot);
    expect(reason).toContain("status: blocked");
    expect(reason).toContain("low battery");
  });
});

describe("computeTrendPoint", () => {
  it("computes 0% active and 0 attention for an all-idle fleet", () => {
    const fleet: FleetState = {
      r1: makeRobot({ robotId: "r1", status: "idle", battery: 50 }),
      r2: makeRobot({ robotId: "r2", status: "idle", battery: 50 }),
    };
    const point = computeTrendPoint(10, fleet);
    expect(point.t).toBe(10);
    expect(point.activePercentage).toBe(0);
    expect(point.averageBattery).toBe(50);
    expect(point.attentionCount).toBe(0);
  });

  it("computes 100% active when every robot is working", () => {
    const fleet: FleetState = {
      r1: makeRobot({ robotId: "r1", status: "active" }),
      r2: makeRobot({ robotId: "r2", status: "on_mission" }),
    };
    const point = computeTrendPoint(20, fleet);
    expect(point.activePercentage).toBe(100);
  });

  it("computes a mixed fleet correctly", () => {
    const fleet: FleetState = {
      r1: makeRobot({ robotId: "r1", status: "active", battery: 60 }),
      r2: makeRobot({ robotId: "r2", status: "idle", battery: 40 }),
      r3: makeRobot({ robotId: "r3", status: "error", battery: 90 }),
      r4: makeRobot({ robotId: "r4", status: "blocked", battery: 10 }),
    };
    const point = computeTrendPoint(30, fleet);
    // 1 of 4 working (active) -> 25%
    expect(point.activePercentage).toBe(25);
    // average of 60, 40, 90, 10 = 50
    expect(point.averageBattery).toBe(50);
    // error, blocked, and the low-battery robot (r4, already counted
    // via blocked) all need attention -> r3 and r4 = 2
    expect(point.attentionCount).toBe(2);
  });

  it("handles an empty fleet without dividing by zero", () => {
    const point = computeTrendPoint(0, {});
    expect(point.activePercentage).toBe(0);
    expect(point.averageBattery).toBe(0);
    expect(point.attentionCount).toBe(0);
  });
});

describe("WORKING_STATUSES / ATTENTION_STATUSES", () => {
  it("does not overlap between working and attention sets", () => {
    for (const status of WORKING_STATUSES) {
      expect(ATTENTION_STATUSES.has(status)).toBe(false);
    }
  });
});
