import { useEffect, useMemo, useState } from "react";
import { useFleetState } from "./hooks/useFleetState";
import { useReplay, type PlaybackSpeed } from "./hooks/useReplay";
import { useLiveSimulator } from "./hooks/useLiveSimulator";
import { Header } from "./components/Header";
import { SummaryCards } from "./components/SummaryCards";
import { SiteMap } from "./components/SiteMap";
import { RobotList } from "./components/RobotList";
import { RobotDetails } from "./components/RobotDetails";
import { FleetTrendChart } from "./components/FleetTrendChart";
import { parseEvents } from "./lib/eventParser";
import type { DataMode, RobotDefinition, RobotEvent } from "./types/fleet";
import "./App.css";

function App() {
  const [robots, setRobots] = useState<RobotDefinition[] | null>(null);
  const [events, setEvents] = useState<RobotEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const [mode, setMode] = useState<DataMode>("replay");

  useEffect(() => {
    Promise.all([
      fetch("/data/robots.json").then((res) => {
        if (!res.ok) throw new Error("Failed to load robots.json");
        return res.json();
      }),
      fetch("/data/events.jsonl").then((res) => {
        if (!res.ok) throw new Error("Failed to load events.jsonl");
        return res.text();
      }),
    ])
      .then(([robotsData, eventsText]) => {
        setRobots(robotsData);
        setEvents(parseEvents(eventsText));
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  const safeRobots = useMemo(() => robots ?? [], [robots]);
  const { fleetState, trendHistory, ingestEvent, reset } = useFleetState(safeRobots);

  const {
    isPlaying,
    currentReplayTime,
    speed,
    play,
    pause,
    restart,
    setSpeed,
  } = useReplay({ events, ingestEvent, onRestart: reset });

  useLiveSimulator({
    enabled: mode === "live",
    fleetState,
    ingestEvent,
  });

  const handleModeChange = (nextMode: DataMode) => {
    if (nextMode === mode) return;
    pause();
    restart(); // resets replay pointer/clock AND fleet state together, via onRestart
    setMode(nextMode);
  };

  const handleSpeedChange = (nextSpeed: PlaybackSpeed) => {
    setSpeed(nextSpeed);
  };

  if (loadError) {
    return (
      <div className="app__loading">
        Couldn't load fleet data: {loadError}. Check that robots.json and
        events.jsonl are in public/data/.
      </div>
    );
  }

  if (!robots) {
    return <div className="app__loading">Loading fleet...</div>;
  }

  return (
    <div className="app">
      <Header
        mode={mode}
        onModeChange={handleModeChange}
        isPlaying={isPlaying}
        currentReplayTime={currentReplayTime}
        speed={speed}
        onPlay={play}
        onPause={pause}
        onRestart={restart}
        onSpeedChange={handleSpeedChange}
      />

      <SummaryCards fleetState={fleetState} />

      <div className="app-main">
        <SiteMap
          fleetState={fleetState}
          selectedRobotId={selectedRobotId}
          onSelectRobot={setSelectedRobotId}
        />

        <div className="app-main__fleet-panel">
          <RobotList
            robots={Object.values(fleetState)}
            selectedRobotId={selectedRobotId}
            onSelectRobot={setSelectedRobotId}
          />
          <RobotDetails
            robot={selectedRobotId ? fleetState[selectedRobotId] : null}
          />
        </div>
      </div>

      <div className="app-trend">
        <FleetTrendChart trendHistory={trendHistory} />
      </div>
    </div>
  );
}

export default App;