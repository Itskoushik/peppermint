import type { RobotDefinition, RobotEvent, FleetState } from "../types/fleet";

/**
 * Parses the raw text content of events.jsonl (newline-delimited JSON)
 * into an array of RobotEvent, sorted by t.
 *
 * The supplied file is already sorted and evenly spaced (verified: 1448
 * events, 181 per robot, exactly 5s apart, t = 0..900), but we sort
 * defensively rather than assume every events.jsonl we're ever handed
 * will be pre-sorted.
 */
export function parseEvents(rawText: string): RobotEvent[] {
  const events = rawText
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as RobotEvent);

  return events.sort((a, b) => a.t - b.t);
}

/**
 * Builds the initial FleetState from the static robot roster
 * (robots.json), before any telemetry has arrived. Every robot starts
 * "idle" at its listed position with a full-ish default battery —
 * this is immediately overwritten by the first real event in both
 * replay and live mode, so the exact defaults here don't matter much.
 */
export function initialFleetState(robots: RobotDefinition[]): FleetState {
  const state: FleetState = {};
  for (const robot of robots) {
    state[robot.robot_id] = {
      robotId: robot.robot_id,
      robotType: robot.robot_type,
      x: robot.start.x,
      y: robot.start.y,
      status: "idle",
      battery: 100,
      lastUpdated: 0,
    };
  }
  return state;
}