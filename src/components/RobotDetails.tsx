import type { RobotState } from "../types/fleet";
import { attentionReason } from "../lib/fleetMetrics";
import { STATUS_COLORS } from "./RobotMarker";

interface RobotDetailsProps {
  robot: RobotState | null;
}

/**
 * Shows full detail for the currently selected robot. Renders nothing
 * meaningful when no robot is selected, rather than showing a blank
 * panel with an unclear empty state.
 */
export function RobotDetails({ robot }: RobotDetailsProps) {
  if (!robot) {
    return (
      <div className="robot-details robot-details--empty">
        Select a robot on the map or in the list to see details.
      </div>
    );
  }

  const reason = attentionReason(robot);

  return (
    <div className="robot-details">
      <div className="robot-details__header">
        <span
          className="robot-list__dot"
          style={{ backgroundColor: STATUS_COLORS[robot.status] }}
        />
        <h3>{robot.robotId.toUpperCase()}</h3>
      </div>

      <dl className="robot-details__grid">
        <dt>Type</dt>
        <dd>{robot.robotType}</dd>

        <dt>Status</dt>
        <dd>{robot.status}</dd>

        <dt>Battery</dt>
        <dd>{robot.battery.toFixed(1)}%</dd>

        <dt>Position</dt>
        <dd>
          ({robot.x.toFixed(1)}, {robot.y.toFixed(1)})
        </dd>

        <dt>Last Update</dt>
        <dd>t = {robot.lastUpdated}s</dd>

        {robot.lastTaskEvent && (
          <>
            <dt>Last Task Event</dt>
            <dd>{robot.lastTaskEvent}</dd>
          </>
        )}
      </dl>

      <div
        className={`robot-details__attention${
          reason ? " robot-details__attention--flagged" : ""
        }`}
      >
        {reason ? `Needs attention: ${reason}` : "No issues - operating normally"}
      </div>
    </div>
  );
}