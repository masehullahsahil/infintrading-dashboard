// Generic agent page: metric cards, a real-data feed uploader, and either
// the validated live feed table or the simulated activity log. Every agent
// shows exactly one feed — live or simulated, never mixed.

import { useMemo, useState } from "react";
import { T } from "../theme";
import { agentDataMode, DATA_MODE } from "../lib/dataSource";
import { FEED_CONTRACTS } from "../lib/agentFeeds";
import {
  DEFAULT_VERDICT_FILTER,
  EVALUATOR_VERDICTS,
  countVerdicts,
  normalizeVerdict,
  prepareEvaluatorRows,
} from "../lib/evaluatorBoard";
import { PageHeader } from "./PageHeader";
import { StatCard } from "./StatCard";
import { LogList } from "./LogList";
import { FeedControls } from "./FeedControls";
import { FeedTable } from "./FeedTable";
import { SupplierCandidates } from "./SupplierCandidates";
import {
  pendingCandidates,
  approvedSupplierRows,
} from "../lib/supplierCandidates";

function LiveBadge({ liveMeta }) {
  const when = liveMeta && liveMeta.scan_at ? liveMeta.scan_at : null;
  const verdicts = liveMeta && liveMeta.verdicts ? liveMeta.verdicts : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        background: T.panel2,
        border: `1px solid ${T.copper}`,
        borderRadius: 10,
        padding: "8px 14px",
        marginBottom: 16,
        fontSize: 12.5,
        color: T.paper,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#4ade80",
        }}
        aria-hidden="true"
      />
      <strong>Live feed</strong>
      {when && <span style={{ color: T.dim }}>updated {when}</span>}
      {verdicts && (
        <span style={{ color: T.dim }}>
          {verdicts.BUY || 0} BUY · {verdicts.WATCH || 0} watch · {verdicts.SKIP || 0} skip
        </span>
      )}
      <span style={{ color: T.dim }}>— refreshes automatically after each scan</span>
    </div>
  );
}

export function AgentPage({
  def,
  agent,
  feeds,
  feedSource,
  liveMeta,
  liveAvailable,
  supplierLiveAvailable,
  onUseLiveFeed,
  onUseLiveSuppliers,
  onToggle,
  onFeedLoaded,
  onClearFeed,
  onTrackDeal,
  isTracked,
  candidates,
  candidateDecisions,
  onApproveCandidate,
  onDismissCandidate,
}) {
  const running = agent.status === "running";
  const contract = FEED_CONTRACTS[def.id];
  const isFinder = def.id === "finder";
  // Approved candidates merge into the roster view as under_review rows.
  const approvedRows =
    isFinder && candidates && candidateDecisions
      ? approvedSupplierRows(candidates, candidateDecisions)
      : [];
  const feed = isFinder && feeds[def.id] ? [...feeds[def.id], ...approvedRows] : feeds[def.id];
  const dataMode = agentDataMode(def.id, { feeds: { ...feeds, [def.id]: feed } });
  const isLiveSource = feedSource && feedSource.source === "live";
  const showLiveSwitch =
    ((def.id === "evaluator" && liveAvailable) ||
      (isFinder && supplierLiveAvailable)) &&
    !isLiveSource;
  const pending =
    isFinder && candidates && candidateDecisions
      ? pendingCandidates(candidates, candidateDecisions)
      : [];
  const rowAction =
    def.id === "evaluator" && onTrackDeal
      ? { label: "Track", onClick: onTrackDeal, isActive: isTracked }
      : null;
  const isEvaluator = def.id === "evaluator";
  const isLiveTable = dataMode === DATA_MODE.LIVE;

  // Evaluator board: hide SKIP verdicts by default and sort by profit/unit
  // descending, so a crowded scan still leads with the actionable deals.
  const [verdictFilter, setVerdictFilter] = useState(DEFAULT_VERDICT_FILTER);
  const verdictCounts = useMemo(
    () => (isEvaluator ? countVerdicts(feed) : null),
    [isEvaluator, feed]
  );
  const tableRows = useMemo(() => {
    if (!isEvaluator || !isLiveTable) return feed;
    return prepareEvaluatorRows(feed, verdictFilter);
  }, [isEvaluator, isLiveTable, feed, verdictFilter]);

  const toggleVerdict = (v) => {
    const norm = normalizeVerdict({ verdict: v });
    setVerdictFilter((prev) => {
      if (prev.includes(norm)) {
        // Never allow deselecting the last chip — the table would go empty.
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== norm);
      }
      return [...prev, norm];
    });
  };

  return (
    <div>
      <PageHeader
        def={def}
        status={agent.status}
        dataMode={dataMode}
        onToggle={onToggle}
      />

      {isLiveSource && <LiveBadge liveMeta={liveMeta} />}

      {showLiveSwitch && (
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={isFinder ? onUseLiveSuppliers : onUseLiveFeed}
            className="mad-btn"
            style={{
              cursor: "pointer",
              background: "transparent",
              color: T.copper,
              border: `1px solid ${T.copper}`,
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Switch to live feed
          </button>{" "}
          <span style={{ fontSize: 11.5, color: T.dim }}>
            Automatic scan results are available
            {liveMeta && liveMeta.scan_at ? ` (updated ${liveMeta.scan_at})` : ""} —
            your uploaded file stays until you switch.
          </span>
        </div>
      )}

      {isFinder && pending.length > 0 && (
        <SupplierCandidates
          candidates={pending}
          onApprove={onApproveCandidate}
          onDismiss={onDismissCandidate}
        />
      )}

      <FeedControls
        contract={contract}
        hasFeed={!!feed}
        onFeedLoaded={(rows, sourceLabel) => onFeedLoaded(def.id, rows, sourceLabel)}
        onClearFeed={() => onClearFeed(def.id)}
      />

      <div className="mad-stat-row">
        {def.metricLabels.map((label, i) => (
          <StatCard key={label} label={label} value={agent.metrics[i]} />
        ))}
      </div>

      {dataMode === DATA_MODE.LIVE ? (
        <>
          {isEvaluator && feed && feed.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 12, color: T.dim }}>Show:</span>
              {EVALUATOR_VERDICTS.map((v) => {
                const active = verdictFilter.includes(v);
                return (
                  <button
                    key={v}
                    onClick={() => toggleVerdict(v)}
                    className="mad-btn"
                    aria-pressed={active}
                    style={{
                      cursor: "pointer",
                      borderRadius: 999,
                      padding: "4px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      background: active ? T.copper : "transparent",
                      color: active ? "#1a120b" : T.dim,
                      border: `1px solid ${active ? T.copper : T.line}`,
                    }}
                  >
                    {v} · {verdictCounts[v]}
                  </button>
                );
              })}
              <span style={{ fontSize: 11.5, color: T.dim }}>
                sorted by profit/unit
              </span>
            </div>
          )}
          <FeedTable contract={contract} rows={tableRows} rowAction={rowAction} />
        </>
      ) : (
        <>
          <div className="mad-panel-card">
            <div className="mad-panel-head">
              Simulated activity — upload real data above to replace this
            </div>
            <LogList logs={agent.logs} running={running} />
          </div>
          <div className="mad-sim-note">
            Feed: simulated —{" "}
            {def.id === "evaluator" || def.id === "finder"
              ? "the automatic scan feed loads on its own when no file is uploaded."
              : "automatic collection (scraper/API) is not wired yet; feed it a file above or see the README."}
          </div>
        </>
      )}
    </div>
  );
}
