import { LayoutGrid, Radar, Wallet, TrendingUp } from "lucide-react";
import { T, FONTS } from "../theme";
import { AGENT_DEFS } from "../lib/agents";
import { agentDataMode, DATA_MODE } from "../lib/dataSource";
import { StatCard } from "./StatCard";
import { StatusBadge } from "./StatusBadge";
import { DemoBadge } from "./DemoBadge";

export function Overview({ agents, feeds, onOpen }) {
  const ctx = { feeds };
  const demoAgents = AGENT_DEFS.filter(
    (d) => agentDataMode(d.id, ctx) === DATA_MODE.DEMO
  );
  const demoNames = demoAgents.map((d) => d.name).join(", ");
  const totalScanned = agents.evaluator.metrics[0];
  const unitsPurchased = agents.bookkeeper.metrics[0];
  const budgetRemaining = agents.bookkeeper.metrics[1];
  const roi = agents.bookkeeper.metrics[2];

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 600 }}>
          Overview
        </div>
        <div style={{ fontSize: 13, color: T.dim, marginTop: 3 }}>
          Every agent&apos;s state, live — nothing running that you can&apos;t see here.
        </div>
      </div>

      {demoAgents.length > 0 && (
        <div
          role="note"
          style={{
            background: T.panel2,
            border: `1px solid ${T.copperDim}`,
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 20,
            fontSize: 12.5,
            color: T.dim,
          }}
        >
          {demoNames} {demoAgents.length === 1 ? "is" : "are"} showing simulated
          data. Open an agent page and upload a real CSV or JSON feed to see
          real numbers — or try the samples at <code>public/sample-*.csv</code>.
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Listings seen" value={totalScanned} icon={Radar} />
        <StatCard label="Units purchased" value={unitsPurchased} icon={Wallet} />
        <StatCard label="Budget remaining" value={budgetRemaining} icon={Wallet} />
        <StatCard label="Blended ROI" value={roi} icon={TrendingUp} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {AGENT_DEFS.map((d) => {
          const a = agents[d.id];
          const Icon = d.icon;
          return (
            <button
              key={d.id}
              onClick={() => onOpen(d.id)}
              className="mad-btn"
              style={{
                textAlign: "left",
                cursor: "pointer",
                background: T.panel,
                border: `1px solid ${T.line}`,
                borderRadius: 12,
                padding: 16,
                color: "inherit",
                font: "inherit",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon size={16} color={T.copper} />
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <DemoBadge mode={agentDataMode(d.id, ctx)} />
                  <StatusBadge status={a.status} />
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: T.dim, marginBottom: 10 }}>{d.role}</div>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 11.5,
                  color: T.dim,
                  borderTop: `1px solid ${T.line}`,
                  paddingTop: 10,
                  minHeight: 32,
                }}
              >
                {a.logs[0] ? a.logs[0].text : "Awaiting first event…"}
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 18,
          fontSize: 11.5,
          color: T.dim,
        }}
      >
        <LayoutGrid size={13} color={T.dim} />
        Figures marked “Simulated feed” are demo placeholders, not real measurements.
      </div>
    </div>
  );
}
