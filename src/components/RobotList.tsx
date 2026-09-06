import { useMemo, useState } from "react";
import type { FilterOption, RobotState } from "../types/fleet";
import { needsAttention, WORKING_STATUSES } from "../lib/fleetMetrics";
import { STATUS_COLORS } from "./RobotMarker";
import "./FleetPanel.css";

interface RobotListProps {
  robots: RobotState[];
  selectedRobotId: string | null;
  onSelectRobot: (robotId: string) => void;
}

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "needs_attention", label: "Needs Attention" },
  { value: "working", label: "Working" },
  { value: "charging", label: "Charging" },
];

function matchesFilter(robot: RobotState, filter: FilterOption): boolean {
  switch (filter) {
    case "needs_attention":
      return needsAttention(robot);
    case "working":
      return WORKING_STATUSES.has(robot.status);
    case "charging":
      return robot.status === "charging";
    case "all":
    default:
      return true;
  }
}

/**
 * Searchable, filterable list of all robots. Selecting a row here
 * drives the same selectedRobotId state that SiteMap reads, so
 * clicking a robot here highlights it on the map and vice versa -
 * the sync happens because both components are handed the same
 * selectedRobotId/onSelectRobot from their shared parent, not because
 * either component knows about the other.
 */
export function RobotList({
  robots,
  selectedRobotId,
  onSelectRobot,
}: RobotListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");

  const filteredRobots = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return robots
      .filter((robot) => matchesFilter(robot, filter))
      .filter((robot) =>
        query === "" ? true : robot.robotId.toLowerCase().includes(query)
      );
  }, [robots, filter, searchQuery]);

  return (
    <div className="robot-list">
      <input
        type="text"
        className="robot-list__search"
        placeholder="Search by robot ID..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="robot-list__filters">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`robot-list__filter-btn${
              filter === option.value ? " robot-list__filter-btn--active" : ""
            }`}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="robot-list__rows">
        {filteredRobots.length === 0 && (
          <div className="robot-list__empty">No robots match.</div>
        )}
        {filteredRobots.map((robot) => (
          <button
            key={robot.robotId}
            type="button"
            className={`robot-list__row${
              robot.robotId === selectedRobotId
                ? " robot-list__row--selected"
                : ""
            }`}
            onClick={() => onSelectRobot(robot.robotId)}
          >
            <span
              className="robot-list__dot"
              style={{ backgroundColor: STATUS_COLORS[robot.status] }}
            />
            <span className="robot-list__id">
              {robot.robotId.toUpperCase()}
            </span>
            <span className="robot-list__type">{robot.robotType}</span>
            <span className="robot-list__status">{robot.status}</span>
            <span className="robot-list__battery">
              {robot.battery.toFixed(0)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}