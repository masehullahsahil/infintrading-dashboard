// AgentDashboard — composition root. All state lives in useAgentSimulation;
// this component only lays out the ticker, sidebar, and the active view.

import { useState } from "react";
import { T, FONTS } from "./theme";
import { AGENT_DEFS } from "./lib/agents";
import { useAgentSimulation } from "./hooks/useAgentSimulation";
import { useIsNarrow } from "./hooks/useIsNarrow";
import { Ticker } from "./components/Ticker";
import { Sidebar } from "./components/Sidebar";
import { Overview } from "./components/Overview";
import { AgentPage } from "./components/AgentPage";

export default function AgentDashboard() {
  const [active, setActive] = useState("overview");
  const { agents, ticker, feeds, toggleAgent, applyFeed, clearFeed } =
    useAgentSimulation();
  const narrow = useIsNarrow();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.ink,
        color: T.paper,
        fontFamily: FONTS.sans,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Ticker items={ticker} />

      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          flexDirection: narrow ? "column" : "row",
        }}
      >
        <Sidebar active={active} onSelect={setActive} agents={agents} narrow={narrow} />

        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: narrow ? 16 : 28,
            overflow: "auto",
          }}
        >
          {active === "overview" ? (
            <Overview agents={agents} feeds={feeds} onOpen={setActive} />
          ) : (
            <AgentPage
              def={AGENT_DEFS.find((d) => d.id === active)}
              agent={agents[active]}
              feeds={feeds}
              onToggle={() => toggleAgent(active)}
              onFeedLoaded={applyFeed}
              onClearFeed={clearFeed}
            />
          )}
        </main>
      </div>
    </div>
  );
}
