import { Circle } from "lucide-react";
import { T } from "../theme";
import { DATA_MODE } from "../lib/dataSource";

/**
 * Labels where an agent's numbers come from: the simulated demo feed or real
 * uploaded data. Honesty about this is a feature, not a caveat.
 */
export function DemoBadge({ mode }) {
  const live = mode === DATA_MODE.LIVE;
  const color = live ? T.green : T.amber;
  return (
    <span
      title={live ? "Showing real uploaded data" : "Showing simulated demo data — not real measurements"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: 0.3,
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}`,
        borderRadius: 999,
        padding: "3px 9px",
        whiteSpace: "nowrap",
      }}
    >
      <Circle size={6} fill={color} color={color} />
      {live ? "Live data" : "Simulated feed"}
    </span>
  );
}
