# Fleet Management Dashboard

A frontend dashboard for an operator managing a fleet of 8 robots — built for the Peppermint Robotics SDE-1 hiring challenge (Assignment 1: Frontend).

## Features

- **Replay mode**: plays back the recorded `events.jsonl` log (15 minutes of telemetry) with Play/Pause/Restart and 1x/2x/5x/10x speed control.
- **Live mode**: generates genuinely new telemetry for the same 8 robots in the browser — not a repeat of the recorded log.
- **Site map**: all 8 robots visible simultaneously, positioned over `layout.png`, colored by status, click to select.
- **Fleet trend chart**: Active Fleet % and Average Battery % over the observed window.
- **Searchable/filterable robot list**: search by ID, filter by All / Needs Attention / Working / Charging.
- **Robot detail panel**: full state for the selected robot, including a plain-language attention reason when applicable.
- Map, list, and detail panel selection stay in sync in both directions.

## Tech stack

React + TypeScript + Vite, plain CSS, Recharts for the trend chart, Vitest for tests. No Redux — the whole fleet fits in one `Record<string, RobotState>`, so a custom hook (`useFleetState`) is the entire state layer.

## Architecture

Both replay and the live simulator are **event producers**. Neither knows anything about the other, and neither talks to the UI directly — they only call one function:

```
events.jsonl → useReplay ──────┐
                                 → ingestEvent(event) → useFleetState → SiteMap
generateNextRobotEvent() ──────┘                                     → RobotList
      (useLiveSimulator)                                             → RobotDetails
                                                                       → FleetTrendChart
```

- `src/hooks/useFleetState.ts` — owns the canonical `fleetState` (latest reading per robot) and `trendHistory` (append-only fleet-level metrics over time). `ingestEvent()` is the single door every event passes through.
- `src/hooks/useReplay.ts` — walks a pointer forward through the pre-sorted `events.jsonl` array as simulated time advances (`advanceReplay()`), rather than one `setInterval` per event. Handles multiple robots reporting at the same timestamp naturally.
- `src/hooks/useLiveSimulator.ts` — ticks roughly once per second, calling the pure `generateNextRobotEvent()` (in `src/lib/simulator.ts`) once per robot, and feeds the result into the same `ingestEvent()`.
- `src/lib/fleetMetrics.ts` — the one place `needsAttention()`, `WORKING_STATUSES`, and `ATTENTION_STATUSES` are defined. Every component that needs to know if a robot is "working" or "needs attention" imports from here rather than re-checking status strings itself.

## How replay works

`useReplay` keeps a simulated clock (`currentReplayTime`) that advances by `realElapsedMs * speed` on every animation frame. A pointer into the events array tracks how far we've consumed; `advanceReplay()` (a pure, unit-tested function) drains every event whose `t` has been reached, in order, before yielding back to the frame loop. This means speed changes take effect immediately (no timer teardown/rebuild) and same-timestamp events (all 8 robots report every 5s) are processed together correctly.

## How the live simulator works

`generateNextRobotEvent()` in `src/lib/simulator.ts` is a pure function: given a robot's previous state and its current movement vector, it returns one plausible next event. Status transitions follow a small explicit probability table per current status (not a uniform random roll each tick), so behavior reads as continuous rather than jittery — e.g. `active` robots mostly stay `active`, sometimes progress to `on_mission`, rarely go `blocked`. Low battery (<20%) biases a robot toward `charging`. Movement bounces off map boundaries rather than sticking to the edge. Emission rate is ~1 event per robot per second (`useLiveSimulator`'s `tickMs` default), matching the suggested rate in the brief.

## How fleet state is shared between replay and live

Both are handed the exact same `ingestEvent` function from `useFleetState`. The dashboard components (`SiteMap`, `RobotList`, `RobotDetails`, `FleetTrendChart`) read only from `fleetState`/`trendHistory` and have no idea whether a given update came from the recorded log or the simulator. Switching modes (`App.tsx`'s `handleModeChange`) pauses replay and calls `restart()`, which resets both the replay pointer/clock and the fleet state together, so switching modes never leaves stale data on screen.

## Status semantics

The challenge deliberately doesn't define "working" or "needs attention" — decided in `src/lib/fleetMetrics.ts`:

- **Working**: `active`, `on_mission`
- **Needs attention**: `blocked`, `error`, `offline`, `maintenance`, **or** battery < 20% regardless of status

The battery threshold is included because a robot at 5% battery mid-mission is exactly the kind of thing an operator should be alerted to, even if its status string looks otherwise fine.

## Install & run

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

Runs the Vitest suite (29 tests across `fleetMetrics.test.ts`, `replay.test.ts`, `simulator.test.ts`) in watch mode. Use `npx vitest run` for a single non-watching pass.

## Build

```bash
npm run build
```

## Deployment

[Deployed link — add after deploying to Vercel/Netlify]

Verified in an incognito/private window before submission.

## Tradeoffs

See `ANSWERS.md` Q2 for the main one (map coordinates hardcoded from the known 900×560 spec rather than measured at runtime).

## What I'd build next

See `ANSWERS.md` Q3.

## AI delegation notes

AI tooling (Claude) was used as a development assistant throughout — for scaffolding component structure, reviewing edge cases (e.g. catching an async-load race condition in `useFleetState` and a state-desync bug on mode switching), and drafting documentation. Architecture decisions, the final implementation, all testing, and validation were reviewed and directed by me at every stage.