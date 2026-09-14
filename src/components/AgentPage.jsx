// Generic agent page: metric cards, a real-data feed uploader, and either
// the validated live feed table or the simulated activity log. Every agent
// shows exactly one feed — live or simulated, never mixed.

import { T, FONTS } from "../theme";
import { agentDataMode, DATA_MODE } from "../lib/dataSource";
import { FEED_CONTRACTS } from "../lib/agentFeeds";
import { PageHeader } from "./PageHeader";
import { StatCard } from "./StatCard";
import { LogList } from "./LogList";
import { FeedControls } from "./FeedControls";
import { FeedTable } from "./FeedTable";

export function AgentPage({
  def,
  agent,
  feeds,
  onToggle,
  onFeedLoaded,
  onClearFeed,
}) {
  const running = agent.status === "running";
  const contract = FEED_CONTRACTS[def.id];
  const feed = feeds[def.id];
  const dataMode = agentDataMode(def.id, { feeds });

  return (
    <div>
      <PageHeader
        def={def}
        status={agent.status}
        dataMode={dataMode}
        onToggle={onToggle}
      />

      <FeedControls
        contract={contract}
        hasFeed={!!feed}
        onFeedLoaded={(rows, sourceLabel) => onFeedLoaded(def.id, rows, sourceLabel)}
        onClearFeed={() => onClearFeed(def.id)}
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {def.metricLabels.map((label, i) => (
          <StatCard key={label} label={label} value={agent.metrics[i]} />
        ))}
      </div>

      {dataMode === DATA_MODE.LIVE ? (
        <FeedTable contract={contract} rows={feed} />
      ) : (
        <>
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
          <div
            style={{
              marginTop: 12,
              fontSize: 11.5,
              color: T.dim,
              fontFamily: FONTS.mono,
            }}
          >
            Feed: simulated — automatic collection (scraper/API) is not wired
            yet; feed it a file above or see the README.
          </div>
        </>
      )}
    </div>
  );
}
