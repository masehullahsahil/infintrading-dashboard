import { T, FONTS } from "../theme";

/** Scrolling strip of the newest event from each agent. Pauses on hover; disabled under reduced-motion. */
export function Ticker({ items }) {
  return (
    <div
      className="mad-ticker"
      role="status"
      aria-label="Latest agent activity"
      style={{
        borderBottom: `1px solid ${T.line}`,
        background: T.panel,
        overflow: "hidden",
        height: 34,
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      <div
        className="mad-ticker-track"
        style={{ whiteSpace: "nowrap", display: "inline-flex" }}
      >
        {[...items, ...items].map((t, i) => (
          <span
            key={i}
            aria-hidden={i >= items.length}
            style={{
              fontFamily: FONTS.mono,
              fontSize: 12,
              color: T.dim,
              padding: "0 28px",
              borderRight: `1px solid ${T.line}`,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
