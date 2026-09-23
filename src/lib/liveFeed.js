// Live Evaluator feed: published by the scheduled Finder/Evaluator scans to
// the repo's data/live-feed branch (listings.json + meta.json). The dashboard
// fetches it on load so the Evaluator board updates automatically — no
// uploads needed. A manual upload always wins: it marks the feed source as
// "upload" and the live feed will not overwrite it until the operator clears
// it or explicitly switches back to live.

import { FEED_CONTRACTS } from "./agentFeeds";

export const LIVE_FEED_BASE =
  "https://raw.githubusercontent.com/masehullahsahil/infintrading-dashboard/data/live-feed";

export const LIVE_FEED_LISTINGS_URL = `${LIVE_FEED_BASE}/listings.json`;
export const LIVE_FEED_META_URL = `${LIVE_FEED_BASE}/meta.json`;
export const LIVE_FEED_SUPPLIERS_URL = `${LIVE_FEED_BASE}/suppliers.json`;
export const LIVE_FEED_CANDIDATES_URL = `${LIVE_FEED_BASE}/candidates.json`;

/**
 * Fetch and validate the live feed.
 * @returns {Promise<{ rows: object[], meta: object } | null>} — null when the
 *   feed is unreachable or fails contract validation. Never throws.
 */
export async function fetchLiveFeed(fetchImpl = fetch) {
  let listingsRes;
  try {
    listingsRes = await fetchImpl(LIVE_FEED_LISTINGS_URL, { cache: "no-store" });
  } catch {
    return null; // offline or DNS failure — stay on whatever feed we had
  }
  if (!listingsRes || !listingsRes.ok) return null;
  let text;
  try {
    text = await listingsRes.text();
  } catch {
    return null;
  }
  const contract = FEED_CONTRACTS.evaluator;
  const parsed = contract.parseText(text, "listings.json");
  if (parsed.error || !parsed.rows || parsed.rows.length === 0) return null;

  let meta = null;
  try {
    const metaRes = await fetchImpl(LIVE_FEED_META_URL, { cache: "no-store" });
    if (metaRes && metaRes.ok) meta = await metaRes.json();
  } catch {
    meta = null; // meta is a nicety; the rows are the payload
  }
  return { rows: parsed.rows, meta };
}

/** True when the live scan is newer than the feed the operator currently has. */
export function liveIsNewer(liveMeta, currentSource) {
  if (!liveMeta || !liveMeta.scan_at) return false;
  if (!currentSource || currentSource.source !== "live") return true;
  if (!currentSource.at) return true;
  return new Date(liveMeta.scan_at) > new Date(currentSource.at);
}

/**
 * Fetch the Finder's live supplier roster (suppliers.json), validated against
 * the finder feed contract. Null when unreachable or invalid. Never throws.
 */
export async function fetchLiveSuppliers(fetchImpl = fetch) {
  let res;
  try {
    res = await fetchImpl(LIVE_FEED_SUPPLIERS_URL, { cache: "no-store" });
  } catch {
    return null;
  }
  if (!res || !res.ok) return null;
  let text;
  try {
    text = await res.text();
  } catch {
    return null;
  }
  const contract = FEED_CONTRACTS.finder;
  const parsed = contract.parseText(text, "suppliers.json");
  if (parsed.error || !parsed.rows || parsed.rows.length === 0) return null;
  return { rows: parsed.rows };
}

/**
 * Fetch proposed supplier candidates (candidates.json) for the Finder's
 * review panel. Returns the array (possibly empty); null only when the feed
 * is unreachable or unparsable. Never throws.
 */
export async function fetchLiveCandidates(fetchImpl = fetch) {
  let res;
  try {
    res = await fetchImpl(LIVE_FEED_CANDIDATES_URL, { cache: "no-store" });
  } catch {
    return null;
  }
  if (!res || !res.ok) return null;
  try {
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    // Drop malformed elements (e.g. null): downstream candidateKey(c)
    // dereferences c.url, which would throw during rendering and take the
    // dashboard to its error boundary.
    return data.filter(
      (c) => c && typeof c === "object" && (c.url || c.company)
    );
  } catch {
    return null;
  }
}
