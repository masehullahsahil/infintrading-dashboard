import { LayoutGrid, Radar, Target, TrendingUp } from "lucide-react";
import { AGENT_DEFS } from "../lib/agents";
import { agentDataMode, DATA_MODE } from "../lib/dataSource";
import { summarizeDeals } from "../lib/deals";
import { StatCard } from "./StatCard";
import { StatusBadge } from "./StatusBadge";
import { DemoBadge } from "./DemoBadge";

export function Overview({ agents, feeds, deals, onOpen }) {
  const ctx = { feeds };
  const demoAgents = AGENT_DEFS.filter(
    (d) => agentDataMode(d.id, ctx) === DATA_MODE.DEMO
  );
  const demoNames = demoAgents.map((d) => d.name).join(", ");
  const totalScanned = agents.evaluator.metrics[0];
  const dealSummary = summarizeDeals(deals);

  return (
    <div>
      <div className="mad-section-head">
        <div className="mad-page-title">Overview</div>
        <div className="mad-page-sub">
          Every agent&apos;s state, live — nothing running that you can&apos;t see here.
        </div>
      </div>

      {demoAgents.length > 0 && (
        <div role="note" className="mad-note">
          {demoNames}: simulated data. Upload a real CSV or JSON feed on an
          agent page to replace it — samples in <code>public/sample-*.csv</code>.
        </div>
      )}

      <div className="mad-stat-row">
        <StatCard label="Listings seen" value={totalScanned} icon={Radar} />
        <StatCard label="Deals tracked" value={dealSummary.tracked} icon={Target} />
        <StatCard label="Closing soon" value={dealSummary.closingSoon} icon={Target} />
        <StatCard label="Deals won" value={dealSummary.won} icon={TrendingUp} />
      </div>

      <div className="mad-agent-grid">
        {AGENT_DEFS.map((d) => {
          const a = agents[d.id];
          const Icon = d.icon;
          return (
            <button
              key={d.id}
              onClick={() => onOpen(d.id)}
              className="mad-btn mad-agent-card"
            >
              <div className="mad-agent-card-top">
                <div className="mad-agent-card-id">
                  <Icon size={16} />
                  <div className="mad-agent-card-name">{d.name}</div>
                </div>
                <div className="mad-agent-card-badges">
                  <DemoBadge mode={agentDataMode(d.id, ctx)} />
                  <StatusBadge status={a.status} />
                </div>
              </div>
              <div className="mad-agent-card-role">{d.role}</div>
              <div className="mad-agent-card-log">
                {a.logs[0] ? a.logs[0].text : "Awaiting first event…"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mad-footnote">
        <LayoutGrid size={13} />
        Figures marked “Simulated feed” are demo placeholders, not real measurements.
      </div>
    </div>
  );
}
