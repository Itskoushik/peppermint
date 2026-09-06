import { useCallback, useEffect, useRef, useState } from "react";
import type { RobotEvent } from "../types/fleet";

export type PlaybackSpeed = 1 | 2 | 5 | 10;

interface UseReplayOptions {
  events: RobotEvent[];
  ingestEvent: (event: RobotEvent) => void;
  onRestart?: () => void;
  defaultSpeed?: PlaybackSpeed;
}

interface UseReplayResult {
  isPlaying: boolean;
  currentReplayTime: number;
  speed: PlaybackSpeed;
  play: () => void;
  pause: () => void;
  restart: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
}

/**
 * Pure replay-advancement step: given a pointer into a sorted events
 * array and a new simulated time, returns every event whose t has now
 * been reached (in order) and the pointer's new position.
 *
 * Kept separate from the animation-frame loop so it can be unit
 * tested directly, without mocking requestAnimationFrame or timers.
 */
export function advanceReplay(
  events: RobotEvent[],
  fromPointer: number,
  toTime: number
): { dueEvents: RobotEvent[]; nextPointer: number } {
  const dueEvents: RobotEvent[] = [];
  let pointer = fromPointer;

  while (pointer < events.length && events[pointer].t <= toTime) {
    dueEvents.push(events[pointer]);
    pointer += 1;
  }

  return { dueEvents, nextPointer: pointer };
}

/**
 * Drives replay of a pre-loaded, pre-sorted RobotEvent[] against
 * ingestEvent(). Uses requestAnimationFrame + a simulated clock rather
 * than one setInterval per event, so:
 *
 * - pause/resume/speed changes are just clock arithmetic, not timer
 *   teardown/rebuild
 * - multiple events sharing the same t (all 8 robots report every 5s)
 *   are drained together on whichever frame crosses that t
 * - speed changes take effect immediately, since every frame recomputes
 *   how far to advance from real elapsed time * speed
 */
export function useReplay({
  events,
  ingestEvent,
  onRestart,
  defaultSpeed = 5,
}: UseReplayOptions): UseReplayResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentReplayTime, setCurrentReplayTime] = useState(0);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(defaultSpeed);

  // Mutable refs for values the animation loop needs without
  // re-subscribing the effect on every render.
  const pointerRef = useRef(0);
  const speedRef = useRef(speed);
  const lastFrameTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  speedRef.current = speed;

  const setSpeed = useCallback((next: PlaybackSpeed) => {
    setSpeedState(next);
  }, []);

  const play = useCallback(() => {
    if (events.length === 0) return;
    setIsPlaying(true);
  }, [events.length]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const restart = useCallback(() => {
    pointerRef.current = 0;
    lastFrameTimeRef.current = null;
    setCurrentReplayTime(0);
    onRestart?.();
  }, [onRestart]);

  useEffect(() => {
    if (!isPlaying) {
      lastFrameTimeRef.current = null;
      return;
    }

    const tick = (now: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = now;
      }
      const realElapsedMs = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      setCurrentReplayTime((prevTime) => {
        const nextTime = prevTime + (realElapsedMs / 1000) * speedRef.current;

        // Drain every event whose t has now been reached, in order.
        // Handles the "multiple robots report at the same t" case
        // naturally, since advanceReplay doesn't stop after one.
        const { dueEvents, nextPointer } = advanceReplay(
          events,
          pointerRef.current,
          nextTime
        );
        dueEvents.forEach(ingestEvent);
        pointerRef.current = nextPointer;

        if (pointerRef.current >= events.length) {
          setIsPlaying(false);
          return events.length > 0 ? events[events.length - 1].t : nextTime;
        }

        return nextTime;
      });

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isPlaying, events, ingestEvent]);

  return {
    isPlaying,
    currentReplayTime,
    speed,
    play,
    pause,
    restart,
    setSpeed,
  };
}