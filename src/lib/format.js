// Display formatting for the metric-card values shown across the dashboard.
//
// Metric values arrive in two shapes: raw numbers (Finder counts, feed
// summarizers) and pre-formatted strings ("$1,240", "41%", "—"). This keeps
// the raw numbers readable at a glance — 1240 becomes "1,240" — while
// passing already-formatted strings through untouched.

export function formatMetric(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("en-US");
  }
  return value;
}
