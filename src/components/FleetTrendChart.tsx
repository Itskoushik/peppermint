import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "../types/fleet";

interface FleetTrendChartProps {
  trendHistory: TrendPoint[];
}

/**
 * Renders fleet-level trends over the observed time window - this is
 * what satisfies the "see how things are trending" requirement. A
 * single current-value readout wouldn't count; this shows the whole
 * history accumulated in trendHistory (Stage 3's useFleetState).
 *
 * Active Fleet % is the mandatory trend. Average Battery is included
 * as the optional second trend the brief allowed for, since it's
 * already computed for free in computeTrendPoint() and adding it as a
 * second <Line> on the same chart costs nothing in complexity.
 */
export function FleetTrendChart({ trendHistory }: FleetTrendChartProps) {
  if (trendHistory.length === 0) {
    return (
      <div className="fleet-trend-chart fleet-trend-chart--empty">
        Trend data will appear once telemetry starts arriving.
      </div>
    );
  }

  return (
    <div className="fleet-trend-chart">
      <h3 className="fleet-trend-chart__title">Fleet Trends</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={trendHistory}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="t"
            stroke="#94a3b8"
            tick={{ fontSize: 12 }}
            label={{ value: "Time (s)", position: "insideBottom", offset: -4, fill: "#94a3b8" }}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
            label={{ value: "%", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
          />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155" }}
            labelFormatter={(t) => `t = ${t}s`}
            formatter={(value) =>
              typeof value === "number" ? `${value.toFixed(1)}%` : String(value)
            }
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="activePercentage"
            name="Active Fleet %"
            stroke="#22c55e"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="averageBattery"
            name="Average Battery %"
            stroke="#06b6d4"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}