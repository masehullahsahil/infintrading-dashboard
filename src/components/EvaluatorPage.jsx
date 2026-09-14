import { useRef, useState } from "react";
import { Upload, CheckCircle2, Trash2 } from "lucide-react";
import { T } from "../theme";
import { agentDataMode } from "../lib/dataSource";
import { parseListingsFile } from "../lib/listingsCsv";
import { PageHeader } from "./PageHeader";
import { StatCard } from "./StatCard";
import { LogList } from "./LogList";

const MAX_TABLE_ROWS = 200;

function Notice({ tone, children }) {
  const color = tone === "error" ? T.red : T.amber;
  return (
    <div
      role={tone === "error" ? "alert" : "note"}
      style={{
        background: T.panel2,
        border: `1px solid ${color}`,
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 16,
        fontSize: 12.5,
        color: T.paper,
      }}
    >
      {children}
    </div>
  );
}

function ListingsTable({ rows }) {
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
        <CheckCircle2 size={13} color={T.green} /> Real listings — {rows.length} rows
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
              <th>Brand</th>
              <th>Model</th>
              <th>CPU</th>
              <th>Gen</th>
              <th>Asking</th>
              <th>Est. Resale</th>
              <th>Margin</th>
              <th>Comp?</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}>
                <td>{r.brand ?? "—"}</td>
                <td>{r.raw_model ?? "—"}</td>
                <td>{r.cpu_family ?? "—"}</td>
                <td>{r.gen ?? "—"}</td>
                <td>{r.asking_price != null ? `$${r.asking_price}` : "—"}</td>
                <td>{r.estimated_resale ? `$${r.estimated_resale}` : "—"}</td>
                <td style={{ color: r.expected_profit > 0 ? T.green : T.dim }}>
                  {r.expected_profit ? `$${r.expected_profit}` : "—"}
                </td>
                <td>
                  {r.has_comp === true || String(r.has_comp).toLowerCase() === "true"
                    ? "✓"
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EvaluatorPage({
  def,
  agent,
  onToggle,
  realListings,
  onListingsLoaded,
  onClearListings,
}) {
  const fileInputRef = useRef(null);
  const [csvError, setCsvError] = useState(null);
  const [csvWarnings, setCsvWarnings] = useState([]);
  const [parsing, setParsing] = useState(false);
  const running = agent.status === "running";
  const dataMode = agentDataMode("evaluator", { realListings });

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setParsing(true);
    setCsvError(null);
    setCsvWarnings([]);
    const { rows, warnings, error } = await parseListingsFile(file);
    setParsing(false);
    if (error) {
      setCsvError(error);
      return;
    }
    setCsvWarnings(warnings);
    onListingsLoaded(rows, file.name);
  };

  const uploadButton = (
    <button
      onClick={() => fileInputRef.current?.click()}
      disabled={parsing}
      className="mad-btn"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        cursor: parsing ? "wait" : "pointer",
        background: T.copper,
        color: T.ink,
        border: "none",
        borderRadius: 8,
        padding: "7px 14px",
        fontSize: 12.5,
        fontWeight: 600,
        opacity: parsing ? 0.7 : 1,
      }}
    >
      <Upload size={13} /> {parsing ? "Parsing…" : "Upload listings.csv"}
    </button>
  );

  const clearButton = realListings ? (
    <button
      onClick={() => {
        setCsvWarnings([]);
        setCsvError(null);
        onClearListings();
      }}
      className="mad-btn"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        background: "transparent",
        color: T.dim,
        border: `1px solid ${T.line}`,
        borderRadius: 8,
        padding: "7px 14px",
        fontSize: 12.5,
        fontWeight: 600,
      }}
    >
      <Trash2 size={13} /> Clear data
    </button>
  ) : null;

  return (
    <div>
      <PageHeader
        def={def}
        status={agent.status}
        dataMode={dataMode}
        onToggle={onToggle}
        actions={
          <>
            {uploadButton}
            {clearButton}
          </>
        }
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {def.metricLabels.map((label, i) => (
          <StatCard key={label} label={label} value={agent.metrics[i]} />
        ))}
      </div>

      {csvError && <Notice tone="error">{csvError}</Notice>}

      {realListings ? (
        <>
          {csvWarnings.map((w, i) => (
            <Notice key={i} tone="warning">
              {w}
            </Notice>
          ))}
          <ListingsTable rows={realListings} />
        </>
      ) : (
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
            }}
          >
            Simulated activity — upload real data above to replace this
          </div>
          <LogList logs={agent.logs} running={running} />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFile}
        style={{ display: "none" }}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
