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
import { EvaluatorPage } from "./components/EvaluatorPage";

export default function AgentDashboard() {
  const [active, setActive] = useState("overview");
  const { agents, ticker, realListings, toggleAgent, applyListings, clearListings } =
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
            <Overview agents={agents} realListings={realListings} onOpen={setActive} />
          ) : active === "evaluator" ? (
            <EvaluatorPage
              def={AGENT_DEFS.find((d) => d.id === "evaluator")}
              agent={agents.evaluator}
              onToggle={() => toggleAgent("evaluator")}
              realListings={realListings}
              onListingsLoaded={applyListings}
              onClearListings={clearListings}
            />
          ) : (
            <AgentPage
              def={AGENT_DEFS.find((d) => d.id === active)}
              agent={agents[active]}
              onToggle={() => toggleAgent(active)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
