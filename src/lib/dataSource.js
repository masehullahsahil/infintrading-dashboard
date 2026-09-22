// Data-source abstraction: every agent view resolves to either the simulated
// demo feed or live data, and the UI badges it accordingly.
//
// Every agent has a live path: an operator-uploaded CSV/JSON feed validated
// against its contract in src/lib/agentFeeds.js. When automatic backends
// arrive (scrapers, APIs), point agentDataMode() at them here and the badges,
// banners, and tick loop follow without touching the components. Simulated
// rows are never mixed into a live feed: an agent shows exactly one feed.

export const DATA_MODE = {
  DEMO: "demo",
  LIVE: "live",
};

/**
 * @param {string} agentId
 * @param {{ feeds: Record<string, object[] | null> }} ctx — validated real-data rows per agent
 * @returns {"demo" | "live"}
 */
export function agentDataMode(agentId, { feeds }) {
  // The Deal Tracker is user state (tracked lots), never a feed — it is
  // never "simulated".
  if (agentId === "deals") return DATA_MODE.LIVE;
  const rows = feeds?.[agentId];
  return rows && rows.length > 0 ? DATA_MODE.LIVE : DATA_MODE.DEMO;
}

export function isSimulated(agentId, ctx) {
  return agentDataMode(agentId, ctx) === DATA_MODE.DEMO;
}
