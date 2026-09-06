# System Design

## 1. What happens if we ask you to add a new feature to this later?

Take **geofencing / restricted zones** as the example feature: highlight zones on the map operators shouldn't send robots into, and flag any robot currently inside one.

This plugs in cleanly without touching the event pipeline. A new `src/lib/geofence.ts` would define zone rectangles (in the same pixel coordinate space robots already use) and a pure `isInRestrictedZone(robot, zones)` function — following the same pattern as `needsAttention()` in `fleetMetrics.ts`. `SiteMap.tsx` would render the zone rectangles as an overlay layer (same percentage-positioning approach `RobotMarker` already uses). `computeTrendPoint()` in `fleetMetrics.ts` could add a `zoneViolationCount` field to `TrendPoint` for free, since it already recomputes fleet-wide metrics on every `ingestEvent()` call. No change would be needed to `useReplay`, `useLiveSimulator`, or `ingestEvent()` itself — the event shape (`RobotEvent`) doesn't need to change, since geofencing is purely a derived view over existing `x`/`y` data.

## 2. What happens if the number of robots grows from 8 to 500?

The first thing to break would be **`RobotList`'s re-render cost**: it recomputes `filteredRobots` via `useMemo` on every fleet update (`src/components/RobotList.tsx`), and re-renders 500 DOM rows every time any single robot's telemetry arrives. At 8 robots with an 8-per-tick-ish arrival rate this is free; at 500 robots with (per the brief's suggested live-mode cadence) roughly one event per robot per second, that's ~500 state updates/second cascading through `fleetState`, each one re-rendering the full list.

Second-order issue: `trendHistory` in `useFleetState.ts` is an ever-growing array with no cap — at 500 robots' worth of events over any meaningful session length, this would grow unbounded and slow down `FleetTrendChart`'s Recharts render, which re-draws the entire line on every new point.

Fixes, roughly in order of impact: virtualize `RobotList` (render only visible rows), batch/throttle `ingestEvent` calls instead of one state update per event (e.g. process a tick's worth of events together), and cap or downsample `trendHistory` (keep last N points, or bucket into coarser time intervals) rather than storing every single point indefinitely.

## 3. What happens if bandwidth is limited?

The current `RobotEvent` shape (`src/types/fleet.ts`) sends full state every tick: `t`, `robot_id`, `x`, `y`, `status`, `battery`. At limited bandwidth, I'd change three things: (1) send delta-encoded updates — only fields that changed since the last report for that robot, since `ingestEvent()` already does a partial merge (`{...existing, ...changedFields}`) rather than requiring a full replacement object; (2) quantize `x`/`y` to integers rather than one-decimal floats, since sub-pixel precision doesn't matter visually; (3) reduce emission frequency for robots that are `idle` or `charging` (nothing meaningfully changes tick-to-tick) while keeping full-rate updates only for `active`/`on_mission` robots. None of these require changing `ingestEvent()`'s signature, since it already accepts a full-or-partial-looking event and only writes the fields present.

## 4. What happens if a robot goes down mid-task and stops responding?

Currently, `RobotState.lastUpdated` (`src/types/fleet.ts`) records the `t` of the most recent event per robot, but nothing in the app currently reads that field to detect staleness — a robot that stops reporting just silently freezes on the map at its last known position, with no visual signal that it's gone quiet. In a real deployment, I'd add a heartbeat check: a periodic comparison of `lastUpdated` against the current clock (replay time or live wall-clock), and if a robot exceeds some staleness threshold, transition it into a synthetic `offline`-like state (without inventing new position data) and surface it through the existing `needsAttention()` path in `fleetMetrics.ts` — since `offline` is already one of the defined attention statuses, no new UI would be needed, just a new code path that sets it.

## 5. What happens if the connection is slow/unreliable and updates arrive late, out of order, or missing?

`ingestEvent()` in `useFleetState.ts` currently applies whatever event it's given unconditionally — it has no concept of event ordering beyond trusting whatever order it's called in. If events arrived out of order over a real network, a late-arriving older event would incorrectly overwrite a newer one. The fix would be adding a monotonic check inside `ingestEvent()`: reject (or queue) any incoming event whose `t` is older than the robot's current `lastUpdated`, so stale/out-of-order data can't regress the displayed state. For missing updates, the heartbeat/staleness mechanism from Q4 would apply the same way. On reconnect, the client would need to request a fresh full-state snapshot (all 8 robots' latest known state) before resuming the incremental event stream, rather than assuming the stream picks up cleanly from wherever it left off.