// Review panel for newly discovered supplier candidates. Pinned at the top of
// the Finder page so proposed suppliers are impossible to miss. Approving
// merges a candidate into the roster view as under_review; dismissing hides it.
// Decisions persist in the browser; the canonical roster + watch list are still
// updated by the owner (chat), never automatically.

import { T, FONTS } from "../theme";

export function SupplierCandidates({ candidates, onApprove, onDismiss }) {
  if (!candidates || candidates.length === 0) return null;
  return (
    <section
      aria-label="New supplier candidates"
      style={{
        marginBottom: 20,
        border: `1px solid ${T.copperDim}`,
        borderRadius: 12,
        background: T.panel2,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: FONTS.display,
            fontSize: 15,
            color: T.copper,
          }}
        >
          New candidates · {candidates.length}
        </h2>
        <span style={{ fontSize: 11.5, color: T.dim }}>
          Found by the daily discovery scan — approve to merge into the roster, or dismiss.
        </span>
      </div>
      <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 10 }}>
        {candidates.map((c) => (
          <li
            key={c.url || c.company}
            style={{
              border: `1px solid ${T.line}`,
              borderRadius: 10,
              background: T.panel,
              padding: "10px 12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noreferrer" style={{ color: T.paper }}>
                      {c.company}
                    </a>
                  ) : (
                    c.company
                  )}
                  <span style={{ fontWeight: 400, color: T.dim, marginLeft: 8, fontSize: 12 }}>
                    {c.type}
                    {c.location ? ` · ${c.location}` : ""}
                  </span>
                </div>
                {c.why_promising && (
                  <div style={{ fontSize: 12.5, color: T.paper, marginTop: 4 }}>{c.why_promising}</div>
                )}
                <div style={{ fontSize: 11.5, color: T.dim, marginTop: 4 }}>
                  {c.how_lots_sold && <span>Sold: {c.how_lots_sold}. </span>}
                  {c.bulk_evidence && <span>Evidence: {c.bulk_evidence}. </span>}
                  {c.open_question && <span>Open: {c.open_question}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => onApprove(c)}
                  className="mad-btn"
                  style={{
                    cursor: "pointer",
                    background: T.copper,
                    color: "#14171D",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  Approve
                </button>
                <button
                  onClick={() => onDismiss(c)}
                  className="mad-btn"
                  style={{
                    cursor: "pointer",
                    background: "transparent",
                    color: T.dim,
                    border: `1px solid ${T.line}`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12.5,
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
