import { Circle } from "lucide-react";
import { DATA_MODE } from "../lib/dataSource";

/**
 * Labels where an agent's numbers come from: the simulated demo feed or real
 * uploaded data. Honesty about this is a feature, not a caveat.
 */
export function DemoBadge({ mode }) {
  const live = mode === DATA_MODE.LIVE;
  return (
    <span
      title={live ? "Showing real uploaded data" : "Showing simulated demo data — not real measurements"}
      className={live ? "mad-badge mad-data-badge mad-data-badge-live" : "mad-badge mad-data-badge"}
    >
      <Circle size={6} fill="currentColor" />
      {live ? "Live data" : "Simulated feed"}
    </span>
  );
}
