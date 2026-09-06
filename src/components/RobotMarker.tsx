import type { RobotState } from "../types/fleet";
import { needsAttention } from "../lib/fleetMetrics";

// One consistent status -> color mapping, used here and reused
// wherever else status needs a visual (RobotList, RobotDetails).
export const STATUS_COLORS: Record<string, string> = {
  idle: "#9ca3af", // neutral gray
  active: "#22c55e", // green
  on_mission: "#3b82f6", // blue
  charging: "#06b6d4", // cyan
  blocked: "#f59e0b", // amber
  error: "#ef4444", // red
  maintenance: "#a855f7", // purple
  offline: "#6b7280", // dark gray
};

interface RobotMarkerProps {
  robot: RobotState;
  mapWidth: number;
  mapHeight: number;
  isSelected: boolean;
  onSelect: (robotId: string) => void;
}

/**
 * Renders one robot as an absolutely-positioned marker over the map
 * image. Position is expressed as a percentage of the image's natural
 * dimensions (robot.x / mapWidth * 100%), so the marker stays aligned
 * with the underlying image regardless of how large the image is
 * rendered on screen - no resize listener needed.
 */
export function RobotMarker({
  robot,
  mapWidth,
  mapHeight,
  isSelected,
  onSelect,
}: RobotMarkerProps) {
  const leftPercent = (robot.x / mapWidth) * 100;
  const topPercent = (robot.y / mapHeight) * 100;
  const color = STATUS_COLORS[robot.status] ?? STATUS_COLORS.idle;
  const attention = needsAttention(robot);

  return (
    <button
      type="button"
      className={`robot-marker${isSelected ? " robot-marker--selected" : ""}${
        attention ? " robot-marker--attention" : ""
      }`}
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        backgroundColor: color,
      }}
      onClick={() => onSelect(robot.robotId)}
      title={`${robot.robotId} - ${robot.status} - ${robot.battery.toFixed(0)}%`}
    >
      <span className="robot-marker__label">
        {robot.robotId.replace("r", "R")}
      </span>
    </button>
  );
}