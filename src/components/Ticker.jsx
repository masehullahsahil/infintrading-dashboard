/** Scrolling strip of the newest event from each agent. Pauses on hover; disabled under reduced-motion. */
export function Ticker({ items }) {
  return (
    <div className="mad-ticker mad-ticker-bar" role="status" aria-label="Latest agent activity">
      <div className="mad-ticker-track">
        {[...items, ...items].map((t, i) => (
          <span key={i} aria-hidden={i >= items.length} className="mad-ticker-item">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
