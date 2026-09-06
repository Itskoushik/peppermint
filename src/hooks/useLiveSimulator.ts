import { useEffect, useRef } from "react";
import type { FleetState, RobotEvent } from "../types/fleet";
import { generateNextRobotEvent, type SimMovement } from "../lib/simulator";

interface UseLiveSimulatorOptions {
  enabled: boolean;
  fleetState: FleetState;
  ingestEvent: (event: RobotEvent) => void;
  tickMs?: number;
}

/**
 * Drives the live feed: once per tick (default ~1s, per the brief's
 * suggested emission rate), generates one new plausible event per
 * robot and pushes it through the same ingestEvent() that replay
 * uses. This is deliberately NOT replaying events.jsonl - it produces
 * genuinely new telemetry via generateNextRobotEvent(), satisfying the
 * "replaying the recording again does not count as live" requirement.
 *
 * Movement vectors and a synthetic clock live in refs here rather than
 * component state, since they're simulation-internal bookkeeping that
 * no UI needs to read or re-render on - only the resulting events
 * (via ingestEvent -> fleetState) need to reach the UI.
 */
export function useLiveSimulator({
  enabled,
  fleetState,
  ingestEvent,
  tickMs = 1000,
}: UseLiveSimulatorOptions): void {
  const movementRef = useRef<Record<string, SimMovement>>({});
  const clockRef = useRef(0);
  const fleetStateRef = useRef(fleetState);
  fleetStateRef.current = fleetState;

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      clockRef.current += tickMs / 1000;
      const t = Math.round(clockRef.current);

      for (const robot of Object.values(fleetStateRef.current)) {
        const movement = movementRef.current[robot.robotId] ?? { dx: 0, dy: 0 };
        const { event, nextMovement } = generateNextRobotEvent(robot, movement, t);
        movementRef.current[robot.robotId] = nextMovement;
        ingestEvent(event);
      }
    }, tickMs);

    return () => clearInterval(interval);
    // fleetStateRef/movementRef/clockRef are refs (stable identity) and
    // read via .current inside the interval, so they're intentionally
    // excluded here - only enabled/tickMs/ingestEvent should restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tickMs, ingestEvent]);
}