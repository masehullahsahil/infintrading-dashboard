import { T, FONTS } from "../theme";
import { DATA_MODE } from "../lib/dataSource";
import { PageHeader } from "./PageHeader";
import { StatCard } from "./StatCard";
import { LogList } from "./LogList";

export function AgentPage({ def, agent, onToggle }) {
  const running = agent.status === "running";
  return (
    <div>
      <PageHeader
        def={def}
        status={agent.status}
        dataMode={DATA_MODE.DEMO}
        onToggle={onToggle}
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {def.metricLabels.map((label, i) => (
          <StatCard key={label} label={label} value={agent.metrics[i]} />
        ))}
      </div>

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
          Activity — newest first
        </div>
        <LogList logs={agent.logs} running={running} />
      </div>

      <div style={{ marginTop: 12, fontSize: 11.5, color: T.dim, fontFamily: FONTS.mono }}>
        Feed: simulated — wire a real backend via src/lib/dataSource.js to go live.
      </div>
    </div>
  );
}
