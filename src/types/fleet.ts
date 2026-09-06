// Core data model for the fleet dashboard.
//
// These types describe three layers of the same fleet:
// - RobotDefinition: static roster info, loaded once from robots.json
// - RobotEvent: a single telemetry reading, as it arrives from either
//   the replay engine or the live simulator
// - RobotState: the latest known state of one robot, kept in the
//   central fleet store

export type RobotStatus =
  | "idle"
  | "active"
  | "on_mission"
  | "charging"
  | "blocked"
  | "error"
  | "maintenance"
  | "offline";

export type RobotType = "picker" | "hauler";

export type TaskEvent = "task_started" | "task_completed";

export interface RobotDefinition {
  robot_id: string;
  robot_type: RobotType;
  start: {
    x: number;
    y: number;
  };
}

// A single telemetry reading. This is the one shape that both the
// replay engine and the live simulator produce, and the only shape
// ingestEvent() ever consumes.
export interface RobotEvent {
  t: number;
  robot_id: string;
  x: number;
  y: number;
  status: RobotStatus;
  battery: number;
  task_event?: TaskEvent;
}

// Latest known state of one robot, as held in the fleet store.
export interface RobotState {
  robotId: string;
  robotType: RobotType;
  x: number;
  y: number;
  status: RobotStatus;
  battery: number;
  lastUpdated: number; // t of the most recent event applied
  lastTaskEvent?: TaskEvent;
}

// One point in the fleet-level trend history, recorded each time an
// event is ingested.
export interface TrendPoint {
  t: number;
  activePercentage: number;
  averageBattery: number;
  attentionCount: number;
}

// The canonical fleet state: latest reading per robot, keyed by robot_id.
export type FleetState = Record<string, RobotState>;

export type DataMode = "replay" | "live";

export type FilterOption = "all" | "needs_attention" | "working" | "charging";