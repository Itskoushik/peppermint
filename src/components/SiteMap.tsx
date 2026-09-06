import type { FleetState } from "../types/fleet";
import { RobotMarker } from "./RobotMarker";
import "./SiteMap.css";

// Confirmed in Stage 0: layout.png is exactly 900x560, and robot
// coordinates use the same pixel space with no scale conversion.
const MAP_WIDTH = 900;
const MAP_HEIGHT = 560;

interface SiteMapProps {
  fleetState: FleetState;
  selectedRobotId: string | null;
  onSelectRobot: (robotId: string) => void;
}

/**
 * Renders the site layout image with all robots overlaid as markers.
 * Markers are positioned with percentages (robot.x / MAP_WIDTH * 100%)
 * rather than pixel offsets, so they stay aligned with the image at
 * any rendered size - the browser handles the scaling, we don't have
 * to measure anything.
 */
export function SiteMap({
  fleetState,
  selectedRobotId,
  onSelectRobot,
}: SiteMapProps) {
  const robots = Object.values(fleetState);

  return (
    <div className="site-map">
      <div className="site-map__frame">
        <img
          src="/data/layout.png"
          alt="Site layout"
          className="site-map__image"
        />
        {robots.map((robot) => (
          <RobotMarker
            key={robot.robotId}
            robot={robot}
            mapWidth={MAP_WIDTH}
            mapHeight={MAP_HEIGHT}
            isSelected={robot.robotId === selectedRobotId}
            onSelect={onSelectRobot}
          />
        ))}
      </div>
    </div>
  );
}