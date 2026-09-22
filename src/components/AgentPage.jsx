// Generic agent page: metric cards, a real-data feed uploader, and either
// the validated live feed table or the simulated activity log. Every agent
// shows exactly one feed — live or simulated, never mixed.

import { T } from "../theme";
import { agentDataMode, DATA_MODE } from "../lib/dataSource";
import { FEED_CONTRACTS } from "../lib/agentFeeds";
import { PageHeader } from "./PageHeader";
import { StatCard } from "./StatCard";
import { LogList } from "./LogList";
import { FeedControls } from "./FeedControls";
import { FeedTable } from "./FeedTable";

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
  onUseLiveFeed,
  onToggle,
  onFeedLoaded,
  onClearFeed,
  onTrackDeal,
  isTracked,
}) {
  const running = agent.status === "running";
  const contract = FEED_CONTRACTS[def.id];
  const feed = feeds[def.id];
  const dataMode = agentDataMode(def.id, { feeds });
  const isLiveSource = feedSource && feedSource.source === "live";
  const showLiveSwitch =
    def.id === "evaluator" && liveAvailable && !isLiveSource;
  const rowAction =
    def.id === "evaluator" && onTrackDeal
      ? { label: "Track", onClick: onTrackDeal, isActive: isTracked }
      : null;

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
            onClick={onUseLiveFeed}
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
        <FeedTable contract={contract} rows={feed} rowAction={rowAction} />
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
            {def.id === "evaluator"
              ? "the automatic scan feed loads on its own when no file is uploaded."
              : "automatic collection (scraper/API) is not wired yet; feed it a file above or see the README."}
          </div>
        </>
      )}
    </div>
  );
}
