import { formatMetric } from "../lib/format";

export function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="mad-stat">
      <div className="mad-stat-head">
        {Icon && <Icon size={13} />}
        <div className="mad-stat-label">{label}</div>
      </div>
      <div className="mad-stat-value">{formatMetric(value)}</div>
    </div>
  );
}
