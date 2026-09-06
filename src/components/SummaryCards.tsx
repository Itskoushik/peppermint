import type { FleetState } from "../types/fleet";
import { needsAttention, WORKING_STATUSES } from "../lib/fleetMetrics";

interface SummaryCardsProps {
  fleetState: FleetState;
}

/**
 * Four at-a-glance fleet numbers, per the brief's recommended layout.
 * Deliberately just four - "do not overdo these" - derived directly
 * from fleetState on every render rather than stored separately,
 * since they're cheap to recompute for an 8-robot fleet and storing
 * them would just be a second copy of the same information.
 */
export function SummaryCards({ fleetState }: SummaryCardsProps) {
  const robots = Object.values(fleetState);
  const total = robots.length;
  const working = robots.filter((r) => WORKING_STATUSES.has(r.status)).length;
  const attention = robots.filter(needsAttention).length;
  const avgBattery =
    total === 0 ? 0 : robots.reduce((sum, r) => sum + r.battery, 0) / total;

  const cards = [
    { label: "Total Robots", value: total },
    { label: "Working", value: working },
    { label: "Needs Attention", value: attention, warn: attention > 0 },
    { label: "Average Battery", value: `${avgBattery.toFixed(0)}%` },
  ];

  return (
    <div className="summary-cards">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`summary-card${card.warn ? " summary-card--warn" : ""}`}
        >
          <div className="summary-card__value">{card.value}</div>
          <div className="summary-card__label">{card.label}</div>
        </div>
      ))}
    </div>
  );
}