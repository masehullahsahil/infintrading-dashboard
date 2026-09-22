// Deal Tracker page: the lots the user is actively pursuing.
// Closing-soon nudges on top, pipeline counts, then the full deal table with
// editable bid plan and outcome tracking. The tracker never bids — it tracks.

import { useMemo, useState } from "react";
import { T } from "../theme";
import {
  ACTIVE_STATUSES,
  DEAL_STATUSES,
  formatCountdown,
  isClosingSoon,
  summarizeDeals,
} from "../lib/deals";
import { PageHeader } from "./PageHeader";
import { StatCard } from "./StatCard";

const STATUS_LABEL = {
  watching: "Watching",
  bidding: "Bidding",
  won: "Won",
  lost: "Lost",
  passed: "Passed",
};

function money(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  const sign = num < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(num)).toLocaleString("en-US")}`;
}

function LotCell({ deal }) {
  const label = deal.lot || "Untitled lot";
  if (deal.lotUrl && /^https?:\/\//i.test(deal.lotUrl)) {
    return (
      <a href={deal.lotUrl} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
  }
  return label;
}

function BidInput({ value, suggested, onCommit }) {
  const [draft, setDraft] = useState(value === null || value === undefined ? "" : String(value));
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      onCommit(null);
      return;
    }
    const num = Number(trimmed);
    onCommit(Number.isFinite(num) ? Math.round(num) : value);
  };
  return (
    <input
      type="number"
      min="0"
      value={draft}
      placeholder={suggested !== null ? `max ${suggested}` : "set bid"}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.target.blur();
      }}
      aria-label="Your planned bid in USD"
      style={{
        width: 92,
        background: T.panel2,
        border: `1px solid ${T.line}`,
        borderRadius: 6,
        color: T.paper,
        padding: "4px 8px",
        fontSize: 12.5,
      }}
    />
  );
}

export function DealTrackerPage({ def, agent, deals, onUpdateDeal, onRemoveDeal, onToggle }) {
  // Fixed "now" per mount: countdowns stay stable across re-renders.
  const [now] = useState(() => Date.now());
  const summary = useMemo(() => summarizeDeals(deals, now), [deals, now]);
  const closingSoon = useMemo(
    () => deals.filter((d) => isClosingSoon(d, now)),
    [deals, now]
  );
  const sorted = useMemo(() => {
    const rank = (d) => (ACTIVE_STATUSES.includes(d.status) ? 0 : 1);
    return [...deals].sort((a, b) => {
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      const ca = a.closesAt || "zzzz";
      const cb = b.closesAt || "zzzz";
      return ca < cb ? -1 : ca > cb ? 1 : 0;
    });
  }, [deals]);

  return (
    <div>
      <PageHeader def={def} status={agent.status} dataMode="live" onToggle={onToggle} />

      <div className="mad-stat-row">
        <StatCard label={def.metricLabels[0]} value={summary.tracked} />
        <StatCard label={def.metricLabels[1]} value={summary.closingSoon} />
        <StatCard label={def.metricLabels[2]} value={summary.won} />
      </div>

      {closingSoon.length > 0 && (
        <div
          role="alert"
          style={{
            background: T.panel2,
            border: `1px solid ${T.copper}`,
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 12.5,
            color: T.paper,
          }}
        >
          <strong>Closing soon</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {closingSoon.map((d) => (
              <li key={d.id}>
                <LotCell deal={d} /> — closes in {formatCountdown(d, now)}
                {d.yourBid !== null && d.yourBid !== undefined
                  ? ` · your bid ${money(d.yourBid)}`
                  : d.suggestedMax !== null
                    ? ` · suggested max ${money(d.suggestedMax)}`
                    : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12,
          fontSize: 12,
          color: T.dim,
        }}
      >
        {DEAL_STATUSES.map((s) => (
          <span
            key={s}
            style={{
              border: `1px solid ${T.line}`,
              borderRadius: 999,
              padding: "3px 10px",
            }}
          >
            {STATUS_LABEL[s]} · {summary.byStatus[s]}
          </span>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="mad-panel-card">
          <div className="mad-panel-head">No tracked deals yet</div>
          <div style={{ padding: "12px 14px", fontSize: 13, color: T.dim }}>
            Flag lots from the Evaluator board with the Track button and they
            will show up here with closing countdowns and your bid plan.
          </div>
        </div>
      ) : (
        <div className="mad-panel-card">
          <div className="mad-panel-head">Tracked deals — {sorted.length}</div>
          <div className="mad-scroll mad-table-wrap">
            <table className="mad-table">
              <thead>
                <tr>
                  <th>Lot</th>
                  <th>Source</th>
                  <th>Verdict</th>
                  <th>Profit/u</th>
                  <th>Suggested max</th>
                  <th>Your bid</th>
                  <th>Closes</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <LotCell deal={d} />
                    </td>
                    <td>{d.source || "—"}</td>
                    <td>{d.verdict || "—"}</td>
                    <td>{money(d.profitPerUnit)}</td>
                    <td>{money(d.suggestedMax)}</td>
                    <td>
                      <BidInput
                        value={d.yourBid}
                        suggested={d.suggestedMax}
                        onCommit={(v) => onUpdateDeal(d.id, { yourBid: v })}
                      />
                    </td>
                    <td>
                      {d.closesAt ? (
                        <>
                          {formatCountdown(d, now)}
                          <div style={{ fontSize: 11, color: T.dim }}>{d.closesAt}</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <select
                        value={d.status}
                        onChange={(e) =>
                          onUpdateDeal(d.id, { status: e.target.value })
                        }
                        aria-label={`Status for ${d.lot}`}
                        style={{
                          background: T.panel2,
                          border: `1px solid ${T.line}`,
                          borderRadius: 6,
                          color: T.paper,
                          padding: "4px 6px",
                          fontSize: 12.5,
                        }}
                      >
                        {DEAL_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        onClick={() => onRemoveDeal(d.id)}
                        className="mad-btn"
                        style={{
                          cursor: "pointer",
                          background: "transparent",
                          color: T.dim,
                          border: `1px solid ${T.line}`,
                          borderRadius: 6,
                          padding: "3px 10px",
                          fontSize: 12,
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mad-sim-note">
        The tracker never bids or contacts sellers — it tracks, you decide.
      </div>
    </div>
  );
}
