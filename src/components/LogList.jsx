function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Newest-first monospace activity log shared by the agent pages. */
export function LogList({ logs, running, maxHeight = 440 }) {
  return (
    <div
      className="mad-scroll mad-log"
      style={{ maxHeight }}
      role="log"
      aria-label="Agent activity"
    >
      {logs.length === 0 ? (
        <div className="mad-log-empty">
          {running ? "Waiting on first event…" : "Agent is paused — no new activity."}
        </div>
      ) : (
        logs.map((l) => (
          <div key={l.id} className="mad-log-row">
            <span className="mad-log-time">{formatTime(l.t)}</span>
            <span>{l.text}</span>
          </div>
        ))
      )}
    </div>
  );
}
