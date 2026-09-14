// Data-source abstraction: every agent view resolves to either the simulated
// demo feed or live data, and the UI badges it accordingly.
//
// Today only the Evaluator has a live path (an uploaded listings.csv). When
// real backends arrive, point agentDataMode() at them here and the badges,
// banners, and tick loop follow without touching the components.

export const DATA_MODE = {
  DEMO: "demo",
  LIVE: "live",
};

/**
 * @param {string} agentId
 * @param {{ realListings: object[] | null }} ctx
 * @returns {"demo" | "live"}
 */
export function agentDataMode(agentId, { realListings }) {
  if (agentId === "evaluator") {
    return realListings && realListings.length > 0 ? DATA_MODE.LIVE : DATA_MODE.DEMO;
  }
  return DATA_MODE.DEMO;
}

export function isSimulated(agentId, ctx) {
  return agentDataMode(agentId, ctx) === DATA_MODE.DEMO;
}
