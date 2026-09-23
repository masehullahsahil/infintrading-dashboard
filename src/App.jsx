// AgentDashboard — composition root. All state lives in useAgentSimulation;
// this component only lays out the ticker, sidebar, and the active view.

import { useState } from "react";
import { AGENT_DEFS } from "./lib/agents";
import { useAgentSimulation } from "./hooks/useAgentSimulation";
import { useIsNarrow } from "./hooks/useIsNarrow";
import { Ticker } from "./components/Ticker";
import { Sidebar } from "./components/Sidebar";
import { Overview } from "./components/Overview";
import { AgentPage } from "./components/AgentPage";
import { DealTrackerPage } from "./components/DealTrackerPage";
import { LockScreen } from "./components/LockScreen";
import { isGateConfigured, isUnlocked, setUnlocked, lock } from "./lib/dashboardAuth";
import { dealIdFromListing } from "./lib/deals";

export default function AgentDashboard() {
  const [active, setActive] = useState("overview");
  // Access gate: the dashboard stays locked until the password is entered.
  // Unlock lasts for the tab session; closing the tab re-locks.
  const [unlocked, setUnlockedState] = useState(() => isUnlocked());
  const gateConfigured = isGateConfigured();

  function handleUnlock() {
    setUnlocked();
    setUnlockedState(true);
  }

  function handleLock() {
    lock();
    setUnlockedState(false);
  }

  // Hooks stay above the gate's early return so call order never changes.
  const {
    agents,
    ticker,
    feeds,
    feedSources,
    deals,
    liveMeta,
    liveAvailable,
    supplierLiveAvailable,
    candidates,
    candidateDecisions,
    toggleAgent,
    applyFeed,
    clearFeed,
    useLiveFeed,
    useLiveSuppliers,
    approveSupplierCandidate,
    dismissSupplierCandidate,
    trackDeal,
    updateDeal,
    removeDeal,
  } = useAgentSimulation();
  const narrow = useIsNarrow();
  const trackedIds = new Set(deals.map((d) => d.id));

  if (!gateConfigured || !unlocked) {
    return <LockScreen configured={gateConfigured} onUnlock={handleUnlock} />;
  }

  return (
    <div className="mad-app">
      <Ticker items={ticker} />

      <div className={narrow ? "mad-layout mad-layout-narrow" : "mad-layout"}>
        <Sidebar active={active} onSelect={setActive} agents={agents} narrow={narrow} onLock={handleLock} />

        <main className={narrow ? "mad-main mad-main-narrow" : "mad-main"}>
          {active === "overview" ? (
            <Overview agents={agents} feeds={feeds} deals={deals} onOpen={setActive} />
          ) : active === "deals" ? (
            <DealTrackerPage
              def={AGENT_DEFS.find((d) => d.id === "deals")}
              agent={agents.deals}
              deals={deals}
              onUpdateDeal={updateDeal}
              onRemoveDeal={removeDeal}
              onToggle={() => toggleAgent("deals")}
            />
          ) : (
            <AgentPage
              def={AGENT_DEFS.find((d) => d.id === active)}
              agent={agents[active]}
              feeds={feeds}
              feedSource={feedSources[active]}
              liveMeta={active === "evaluator" ? liveMeta : null}
              liveAvailable={active === "evaluator" && liveAvailable}
              supplierLiveAvailable={active === "finder" && supplierLiveAvailable}
              onUseLiveFeed={useLiveFeed}
              onUseLiveSuppliers={useLiveSuppliers}
              onToggle={() => toggleAgent(active)}
              onFeedLoaded={applyFeed}
              onClearFeed={clearFeed}
              onTrackDeal={active === "evaluator" ? trackDeal : undefined}
              candidates={active === "finder" ? candidates : undefined}
              candidateDecisions={active === "finder" ? candidateDecisions : undefined}
              onApproveCandidate={approveSupplierCandidate}
              onDismissCandidate={dismissSupplierCandidate}
              isTracked={
                active === "evaluator"
                  ? (row) => trackedIds.has(dealIdFromListing(row))
                  : undefined
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}
