import type { RobotState, RobotStatus } from "../types/fleet";

// Map boundaries - same 900x560 confirmed for layout.png in Stage 0.
export const SIM_MAP_WIDTH = 900;
export const SIM_MAP_HEIGHT = 560;

const MOVE_SPEED = 6; // units per tick, per robot, while moving
const BATTERY_DRAIN_PER_TICK = 0.15; // % lost per tick while working
const BATTERY_CHARGE_PER_TICK = 0.6; // % gained per tick while charging
const LOW_BATTERY_THRESHOLD = 20;
const CHARGE_TARGET = 90; // stop charging once battery reaches this

// Internal per-robot movement memory the simulator needs beyond what
// RobotState already tracks. Kept here rather than bolted onto
// RobotState itself, since direction/velocity is a simulation detail,
// not part of the real telemetry shape ingestEvent() consumes.
export interface SimMovement {
  dx: number;
  dy: number;
}

function randomDirection(): SimMovement {
  const angle = Math.random() * Math.PI * 2;
  return { dx: Math.cos(angle) * MOVE_SPEED, dy: Math.sin(angle) * MOVE_SPEED };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Small, explicit status transition table - deliberately not a random
 * roll every tick, per the brief's "should look believable" guidance.
 * Each working status has a modest chance to progress or occasionally
 * degrade; idle/charging have their own low-probability transitions.
 * Everything else (blocked/error/maintenance/offline) has a chance to
 * recover back to idle, so robots don't get stuck in attention states
 * forever once the live feed has been running a while.
 */
function nextStatus(current: RobotStatus, battery: number): RobotStatus {
  const roll = Math.random();

  if (battery < LOW_BATTERY_THRESHOLD && current !== "charging") {
    // Low battery robots head to charging rather than continuing to work.
    return roll < 0.5 ? "charging" : current;
  }

  switch (current) {
    case "idle":
      if (roll < 0.15) return "active";
      return "idle";
    case "active":
      if (roll < 0.2) return "on_mission";
      if (roll < 0.23) return "blocked";
      if (roll < 0.25) return "idle";
      return "active";
    case "on_mission":
      if (roll < 0.15) return "idle";
      if (roll < 0.17) return "error";
      return "on_mission";
    case "charging":
      if (battery >= CHARGE_TARGET) return "idle";
      return "charging";
    case "blocked":
    case "error":
    case "maintenance":
    case "offline":
      if (roll < 0.3) return "idle";
      return current;
    default:
      return current;
  }
}

/**
 * Generates the next plausible telemetry event for one robot, given
 * its previous state and current movement vector. Pure function - no
 * timers, no side effects - so it can be unit tested directly and
 * reused by whatever cadence useLiveSimulator chooses to call it at.
 */
export function generateNextRobotEvent(
  prevState: RobotState,
  movement: SimMovement,
  t: number
): { event: { t: number; robot_id: string; x: number; y: number; status: RobotStatus; battery: number }; nextMovement: SimMovement } {
  const status = nextStatus(prevState.status, prevState.battery);

  // Occasionally pick a new direction; otherwise keep drifting the
  // same way, so movement reads as continuous rather than jittery.
  const shouldRedirect = Math.random() < 0.1;
  let nextMovement = shouldRedirect ? randomDirection() : movement;

  const isMoving = status === "active" || status === "on_mission";
  let nextX = prevState.x;
  let nextY = prevState.y;

  if (isMoving) {
    nextX = clamp(prevState.x + nextMovement.dx, 0, SIM_MAP_WIDTH);
    nextY = clamp(prevState.y + nextMovement.dy, 0, SIM_MAP_HEIGHT);

    // Bounce off boundaries rather than sticking to the edge.
    if (nextX === 0 || nextX === SIM_MAP_WIDTH) nextMovement = { ...nextMovement, dx: -nextMovement.dx };
    if (nextY === 0 || nextY === SIM_MAP_HEIGHT) nextMovement = { ...nextMovement, dy: -nextMovement.dy };
  }

  let nextBattery = prevState.battery;
  if (status === "charging") {
    nextBattery = clamp(prevState.battery + BATTERY_CHARGE_PER_TICK, 0, 100);
  } else if (isMoving) {
    nextBattery = clamp(prevState.battery - BATTERY_DRAIN_PER_TICK, 0, 100);
  }

  return {
    event: {
      t,
      robot_id: prevState.robotId,
      x: nextX,
      y: nextY,
      status,
      battery: nextBattery,
    },
    nextMovement,
  };
}