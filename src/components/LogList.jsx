import { T, FONTS } from "../theme";

function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Newest-first monospace activity log shared by the agent pages. */
export function LogList({ logs, running, maxHeight = 440 }) {
  return (
    <div
      className="mad-scroll"
      style={{ maxHeight, overflowY: "auto" }}
      role="log"
      aria-label="Agent activity"
    >
      {logs.length === 0 ? (
        <div
          style={{
            padding: 24,
            fontSize: 12.5,
            color: T.dim,
            fontFamily: FONTS.mono,
          }}
        >
          {running ? "Waiting on first event…" : "Agent is paused — no new activity."}
        </div>
      ) : (
        logs.map((l) => (
          <div
            key={l.id}
            className="mad-log-row"
            style={{
              display: "flex",
              gap: 12,
              padding: "9px 16px",
              borderBottom: `1px solid ${T.line}`,
              fontFamily: FONTS.mono,
              fontSize: 12.5,
            }}
          >
            <span style={{ color: T.dim, minWidth: 62, flexShrink: 0 }}>
              {formatTime(l.t)}
            </span>
            <span style={{ color: T.paper }}>{l.text}</span>
          </div>
        ))
      )}
    </div>
  );
}
