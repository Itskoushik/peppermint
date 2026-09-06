import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FleetState,
  RobotDefinition,
  RobotEvent,
  TrendPoint,
} from "../types/fleet";
import { initialFleetState } from "../lib/eventParser";
import { computeTrendPoint } from "../lib/fleetMetrics";

interface UseFleetStateResult {
  fleetState: FleetState;
  trendHistory: TrendPoint[];
  ingestEvent: (event: RobotEvent) => void;
  reset: () => void;
}

/**
 * Owns the single canonical fleet state: the latest reading per robot,
 * plus a running trend history. This is the one place ingestEvent()
 * lives — both the replay engine and the live simulator call it, and
 * neither knows or cares which one is calling.
 *
 * Splitting fleetState (latest-only, O(1) per update) from trendHistory
 * (append-only, grows over the session) means components that only
 * care about "where is robot X right now" never re-render because of
 * trend bookkeeping, and the trend chart never has to derive history
 * from robot state that doesn't keep any.
 */
export function useFleetState(
  robots: RobotDefinition[]
): UseFleetStateResult {
  const [fleetState, setFleetState] = useState<FleetState>(() =>
    initialFleetState(robots)
  );
  const [trendHistory, setTrendHistory] = useState<TrendPoint[]>([]);

  // robots list doesn't change during a session, so keep a stable ref
  // for reset() without needing it in ingestEvent's dependency chain.
  const robotsRef = useRef(robots);
  robotsRef.current = robots;

  // robots.json loads asynchronously, so the *first* render often
  // passes an empty roster before the real one arrives. The lazy
  // useState initializer above only runs once and would otherwise
  // leave fleetState permanently empty. This effect re-syncs fleet
  // state whenever the actual robots list changes (in practice: once,
  // the moment robots.json finishes loading), so markers appear as
  // soon as the roster is known rather than only after an explicit
  // reset()/restart.
  useEffect(() => {
    setFleetState(initialFleetState(robots));
    setTrendHistory([]);
  }, [robots]);

  const ingestEvent = useCallback((event: RobotEvent) => {
    setFleetState((prev) => {
      const existing = prev[event.robot_id];
      if (!existing) {
        // Event for a robot we don't know about — ignore rather than
        // crash. Shouldn't happen with our fixed 8-robot roster, but
        // an ingest path should never throw on unexpected input.
        return prev;
      }

      const next: FleetState = {
        ...prev,
        [event.robot_id]: {
          ...existing,
          x: event.x,
          y: event.y,
          status: event.status,
          battery: event.battery,
          lastUpdated: event.t,
          lastTaskEvent: event.task_event ?? existing.lastTaskEvent,
        },
      };

      // Trend point is derived from the state *after* this event is
      // applied, so it always reflects what the UI will show.
      setTrendHistory((prevTrend) => [
        ...prevTrend,
        computeTrendPoint(event.t, next),
      ]);

      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setFleetState(initialFleetState(robotsRef.current));
    setTrendHistory([]);
  }, []);

  return { fleetState, trendHistory, ingestEvent, reset };
}