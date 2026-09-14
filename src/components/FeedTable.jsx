// Renders one agent's validated real-data feed as a table, driven by the
// agent's contract (tableColumns). Blank cells render as "—"; money columns
// as $1,240; boolean columns as ✓/—.

import { CheckCircle2 } from "lucide-react";
import { T } from "../theme";

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

export function FeedTable({ contract, rows }) {
  const shown = rows.slice(0, MAX_TABLE_ROWS);
  return (
    <div
      style={{
        background: T.panel,
        border: `1px solid ${T.line}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderBottom: `1px solid ${T.line}`,
          fontSize: 11.5,
          color: T.dim,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <CheckCircle2 size={13} color={T.green} /> Real {contract.recordNoun} —{" "}
        {rows.length} rows
        {rows.length > MAX_TABLE_ROWS && (
          <span style={{ textTransform: "none", letterSpacing: 0 }}>
            (showing first {MAX_TABLE_ROWS})
          </span>
        )}
      </div>
      <div
        className="mad-scroll"
        style={{ maxHeight: 460, overflowX: "auto", overflowY: "auto" }}
      >
        <table className="mad-table">
          <thead>
            <tr>
              {contract.tableColumns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}>
                {contract.tableColumns.map((c) => (
                  <td key={c.key}>{formatCell(r[c.key], c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
