// Renders one agent's validated real-data feed as a table, driven by the
// agent's contract (tableColumns). Blank cells render as "—"; money columns
// as $1,240; boolean columns as ✓/—.

import { CheckCircle2 } from "lucide-react";

const MAX_TABLE_ROWS = 200;

function formatCell(value, col) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "—";
  }
  if (col.money) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "—";
    const sign = num < 0 ? "-" : "";
    return `${sign}$${Math.abs(Math.round(num)).toLocaleString("en-US")}`;
  }
  if (col.bool) {
    return value === true || String(value).trim().toLowerCase() === "true"
      ? "✓"
      : "—";
  }
  return String(value);
}

function renderCell(row, col) {
  const value = row[col.key];
  if (col.link && row[col.link]) {
    const href = String(row[col.link]).trim();
    if (/^https?:\/\//i.test(href)) {
      const label = formatCell(value, col);
      return (
        <a href={href} target="_blank" rel="noreferrer">
          {label}
        </a>
      );
    }
  }
  return formatCell(value, col);
}

export function FeedTable({ contract, rows, rowAction }) {
  const shown = rows.slice(0, MAX_TABLE_ROWS);
  return (
    <div className="mad-panel-card">
      <div className="mad-panel-head">
        <CheckCircle2 size={13} className="mad-panel-head-icon" /> Real {contract.recordNoun} —{" "}
        {rows.length} rows
        {rows.length > MAX_TABLE_ROWS && (
          <span className="mad-panel-head-plain">
            (showing first {MAX_TABLE_ROWS})
          </span>
        )}
      </div>
      <div className="mad-scroll mad-table-wrap">
        <table className="mad-table">
          <thead>
            <tr>
              {contract.tableColumns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              {rowAction && <th aria-label="Row actions" />}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}>
                {contract.tableColumns.map((c) => (
                  <td key={c.key}>{renderCell(r, c)}</td>
                ))}
                {rowAction && (
                  <td>
                    <button
                      onClick={() => rowAction.onClick(r)}
                      disabled={rowAction.isActive && rowAction.isActive(r)}
                      className="mad-btn"
                      style={{
                        cursor:
                          rowAction.isActive && rowAction.isActive(r)
                            ? "default"
                            : "pointer",
                        background: "transparent",
                        color:
                          rowAction.isActive && rowAction.isActive(r)
                            ? "#4ade80"
                            : "#C1794A",
                        border: "1px solid #2C313C",
                        borderRadius: 6,
                        padding: "3px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {rowAction.isActive && rowAction.isActive(r)
                        ? "Tracked ✓"
                        : rowAction.label}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
