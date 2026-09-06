# Answers

## 1. What holds the fleet's state as data arrives, and why that shape, given that both replay and live feed need to drive the same views?

`src/hooks/useFleetState.ts` holds it, as two separate pieces of state: `fleetState` (a `Record<string, RobotState>` — one entry per robot, always exactly 8 keys, always the *latest* reading) and `trendHistory` (an append-only array of `TrendPoint`, one per event ingested). Both are only ever touched through a single function, `ingestEvent(event)`.

The two-piece shape is deliberate. `fleetState` needs to answer "where is robot X *right now*" — O(1) to update, no growth over a session. `trendHistory` needs to answer "how has the fleet changed *over time*" — it only ever grows. Keeping them as separate `useState` calls means a component like `SiteMap` or `RobotDetails`, which only cares about current positions, never re-renders because of trend bookkeeping it doesn't use, and `FleetTrendChart` never has to derive a history from state that doesn't keep any.

Because `useReplay` (`src/hooks/useReplay.ts`) and `useLiveSimulator` (`src/hooks/useLiveSimulator.ts`) are both handed the exact same `ingestEvent` reference and neither knows or cares where it's called from, every downstream component is automatically source-agnostic — swapping Replay for Live in `App.tsx` never requires touching `SiteMap`, `RobotList`, `RobotDetails`, or `FleetTrendChart` at all.

## 2. Name one real tradeoff you made while building this, and argue for the decision. What did it cost you?

In `src/components/SiteMap.tsx`, the map's pixel dimensions (`MAP_WIDTH`/`MAP_HEIGHT = 900/560`) are hardcoded constants rather than measured at runtime from the loaded image's `naturalWidth`/`naturalHeight`. The challenge PDF explicitly states the image is 900×560 with 1px = 1 unit, so I treated that as a known spec rather than something to discover — this avoids an `onLoad` handler, a loading-state dance, and an extra `useState` just to hold a value that's already given.

The cost: if `layout.png` were ever swapped for a differently-sized image without also updating the constant, marker positions would silently misalign rather than adapting automatically. For an 8-robot fixed-roster hiring challenge with one specified map, I judged that risk acceptable in exchange for simpler code — but it's a real coupling between a hardcoded value and an asset file that a more defensive version would avoid by measuring the image directly.

## 3. What did you leave out, and what would you build next given more time?

- **Chart/panel CSS is split unevenly**: `FleetTrendChart`'s styles ended up in `FleetPanel.css` for convenience (one shared stylesheet, one import), even though the file name no longer accurately describes its contents. With more time I'd split this into a proper `dashboard.css` or co-locate styles per component.
- **`task_started`/`task_completed` events** are captured in `RobotState.lastTaskEvent` and shown in the detail panel when present, but there's no dedicated task-lifecycle UI — per the brief, these were explicitly optional and rare (2 out of 1448 events), so I didn't build more around them.
- **Live simulator status transitions use a fixed hand-tuned probability table** (`src/lib/simulator.ts`) rather than anything resembling the actual statistical distribution of the recorded data. With more time I'd derive transition probabilities from `events.jsonl` itself so live-mode behavior more closely mirrors the real fleet's patterns.
- **No persistence** — refreshing the page always restarts from `robots.json` defaults. A real operator dashboard would likely want the session state to survive a reload.
- **The 30%-per-tick self-recovery chance** for attention statuses (`blocked`/`error`/`maintenance`/`offline` in `nextStatus()`) is a value I chose so a long live session doesn't get stuck with a permanently red fleet — it's not specified anywhere in the brief, and a real system would probably want an operator-initiated resolution instead of automatic recovery.