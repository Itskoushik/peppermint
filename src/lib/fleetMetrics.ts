// Status semantics for the fleet dashboard.
//
// The hiring challenge deliberately does not define what counts as
// "working" or "needs attention" — we make that call here, in one
// place, so it's never duplicated or drifted across components.
//
// WORKING: the robot is doing something useful right now.
//   active      - robot is moving/operating but not yet on a mission
//   on_mission  - robot is actively executing a mission
//
// NEEDS_ATTENTION: the robot is in a state an operator should look at.
//   blocked      - physically stuck, can't proceed
//   error        - reporting a fault
//   offline      - not reporting normally / assumed disconnected
//   maintenance  - pulled out of service
// We also treat low battery (<20%) as needing attention regardless of
// status, since a robot that's about to die mid-mission is exactly
// the kind of thing an operator wants surfaced early.

export const WORKING_STATUSES = new Set<string>(["active", "on_mission"]);

export const ATTENTION_STATUSES = new Set<string>([
  "blocked",
  "error",
  "offline",
  "maintenance",
]);

export const LOW_BATTERY_THRESHOLD = 20;

import type { FleetState, RobotState, TrendPoint } from "../types/fleet";

/**
 * Returns true if this robot should be flagged for operator attention,
 * either because of its status or because its battery is critically low.
 *
 * This is the single source of truth for "needs attention" — every
 * component (summary cards, robot list filter, detail panel) calls
 * this instead of re-checking status/battery itself.
 */
export function needsAttention(robot: RobotState): boolean {
  return (
    ATTENTION_STATUSES.has(robot.status) ||
    robot.battery < LOW_BATTERY_THRESHOLD
  );
}

/**
 * Human-readable reason a robot needs attention, for the detail panel.
 * Returns null if the robot is fine.
 */
export function attentionReason(robot: RobotState): string | null {
  const reasons: string[] = [];
  if (ATTENTION_STATUSES.has(robot.status)) {
    reasons.push(`status: ${robot.status}`);
  }
  if (robot.battery < LOW_BATTERY_THRESHOLD) {
    reasons.push(`low battery: ${robot.battery.toFixed(1)}%`);
  }
  return reasons.length > 0 ? reasons.join(", ") : null;
}

/**
 * Computes a single fleet-level trend point from the current fleet
 * state. Called every time an event is ingested, so trendHistory can
 * be built up incrementally.
 */
export function computeTrendPoint(
  t: number,
  fleetState: FleetState
): TrendPoint {
  const robots = Object.values(fleetState);
  const total = robots.length;

  if (total === 0) {
    return { t, activePercentage: 0, averageBattery: 0, attentionCount: 0 };
  }

  const workingCount = robots.filter((r) => WORKING_STATUSES.has(r.status)).length;
  const attentionCount = robots.filter(needsAttention).length;
  const totalBattery = robots.reduce((sum, r) => sum + r.battery, 0);

  return {
    t,
    activePercentage: (workingCount / total) * 100,
    averageBattery: totalBattery / total,
    attentionCount,
  };
}
