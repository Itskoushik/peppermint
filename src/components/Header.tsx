import type { DataMode } from "../types/fleet";
import type { PlaybackSpeed } from "../hooks/useReplay";

const SPEED_OPTIONS: PlaybackSpeed[] = [1, 2, 5, 10];

interface HeaderProps {
  mode: DataMode;
  onModeChange: (mode: DataMode) => void;
  isPlaying: boolean;
  currentReplayTime: number;
  speed: PlaybackSpeed;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
}

/**
 * Top header: title, Replay/Live mode switch, and (only in replay
 * mode) playback controls including the speed selector. The speed
 * selector satisfies the mandatory "replay faster than real time or
 * provide a speed control" requirement - useReplay already supported
 * arbitrary speeds internally, this is what exposes it in the UI.
 */
export function Header({
  mode,
  onModeChange,
  isPlaying,
  currentReplayTime,
  speed,
  onPlay,
  onPause,
  onRestart,
  onSpeedChange,
}: HeaderProps) {
  return (
    <header className="app-header">
      <h1 className="app-header__title">Fleet Management Dashboard</h1>

      <div className="app-header__controls">
        <div className="app-header__mode-switch">
          <button
            type="button"
            className={`app-header__mode-btn${mode === "replay" ? " app-header__mode-btn--active" : ""}`}
            onClick={() => onModeChange("replay")}
          >
            Replay
          </button>
          <button
            type="button"
            className={`app-header__mode-btn${mode === "live" ? " app-header__mode-btn--active" : ""}`}
            onClick={() => onModeChange("live")}
          >
            Live
          </button>
        </div>

        {mode === "replay" ? (
          <div className="app-header__replay-controls">
            <button type="button" onClick={onPlay} disabled={isPlaying}>
              Play
            </button>
            <button type="button" onClick={onPause} disabled={!isPlaying}>
              Pause
            </button>
            <button type="button" onClick={onRestart}>
              Restart
            </button>

            <div className="app-header__speed-group">
              {SPEED_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`app-header__speed-btn${speed === option ? " app-header__speed-btn--active" : ""}`}
                  onClick={() => onSpeedChange(option)}
                >
                  {option}x
                </button>
              ))}
            </div>

            <span className="app-header__time">
              t = {currentReplayTime.toFixed(1)}s
            </span>
          </div>
        ) : (
          <span className="app-header__live-indicator">● Live feed running</span>
        )}
      </div>
    </header>
  );
}