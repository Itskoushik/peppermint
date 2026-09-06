import { describe, it, expect } from "vitest";
import {
  generateNextRobotEvent,
  SIM_MAP_WIDTH,
  SIM_MAP_HEIGHT,
} from "../src/lib/simulator";
import type { RobotState } from "../src/types/fleet";

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

describe("generateNextRobotEvent", () => {
  it("keeps x within map boundaries even when pushed far past the edge", () => {
    const robot = makeRobot({ x: 5, y: 100, status: "active", battery: 80 });
    const movement = { dx: -50, dy: 0 };
    const { event } = generateNextRobotEvent(robot, movement, 1);
    expect(event.x).toBeGreaterThanOrEqual(0);
    expect(event.x).toBeLessThanOrEqual(SIM_MAP_WIDTH);
  });

  it("keeps y within map boundaries even when pushed far past the edge", () => {
    const robot = makeRobot({ x: 100, y: SIM_MAP_HEIGHT - 5, status: "on_mission", battery: 80 });
    const movement = { dx: 0, dy: 50 };
    const { event } = generateNextRobotEvent(robot, movement, 1);
    expect(event.y).toBeGreaterThanOrEqual(0);
    expect(event.y).toBeLessThanOrEqual(SIM_MAP_HEIGHT);
  });

  it("does not move a robot that is idle", () => {
    const robot = makeRobot({ x: 400, y: 300, status: "idle", battery: 80 });
    const movement = { dx: 6, dy: 6 };
    const { event } = generateNextRobotEvent(robot, movement, 1);
    if (event.status === "idle") {
      expect(event.x).toBe(400);
      expect(event.y).toBe(300);
    }
  });

  it("drains battery while working (active/on_mission)", () => {
    const robot = makeRobot({ status: "active", battery: 50 });
    const movement = { dx: 6, dy: 0 };
    const { event } = generateNextRobotEvent(robot, movement, 1);
    if (event.status === "active" || event.status === "on_mission") {
      expect(event.battery).toBeLessThan(50);
    }
  });

  it("increases battery while charging", () => {
    const robot = makeRobot({ status: "charging", battery: 50 });
    const movement = { dx: 0, dy: 0 };
    const { event } = generateNextRobotEvent(robot, movement, 1);
    expect(event.battery).toBeGreaterThanOrEqual(50);
  });

  it("never lets battery exceed 100 or drop below 0", () => {
    const highBattery = makeRobot({ status: "charging", battery: 99.9 });
    const { event: highEvent } = generateNextRobotEvent(highBattery, { dx: 0, dy: 0 }, 1);
    expect(highEvent.battery).toBeLessThanOrEqual(100);

    const lowBattery = makeRobot({ status: "active", battery: 0.05 });
    const { event: lowEvent } = generateNextRobotEvent(lowBattery, { dx: 6, dy: 0 }, 1);
    expect(lowEvent.battery).toBeGreaterThanOrEqual(0);
  });

  it("preserves the robot_id and uses the given t", () => {
    const robot = makeRobot({ robotId: "r7" });
    const { event } = generateNextRobotEvent(robot, { dx: 0, dy: 0 }, 42);
    expect(event.robot_id).toBe("r7");
    expect(event.t).toBe(42);
  });

  it("returns a next movement vector for the caller to persist", () => {
    const robot = makeRobot({ status: "active" });
    const { nextMovement } = generateNextRobotEvent(robot, { dx: 3, dy: 4 }, 1);
    expect(typeof nextMovement.dx).toBe("number");
    expect(typeof nextMovement.dy).toBe("number");
  });
});