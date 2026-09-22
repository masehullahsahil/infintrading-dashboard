// Deal Tracker: the lots the user is actively pursuing.
//
// Deals are user state, not a feed — created from Evaluator rows with the
// "Track" button, edited on the Deal Tracker page, persisted in
// localStorage. Nothing here is ever simulated.

export const DEAL_STATUSES = ["watching", "bidding", "won", "lost", "passed"];
export const ACTIVE_STATUSES = ["watching", "bidding"];

// Feed rows carry closes_at like "2026-09-25 17:31 CDT". Parse it into a
// Date; return null when the value is missing or unparseable.
export function parseClosesAt(value) {
  if (!value) return null;
  const m = String(value)
    .trim()
    .match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?\s*([A-Za-z]*)$/
    );
  if (!m) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [, y, mo, d, h, mi, s, tz] = m;
  const upper = (tz || "").toUpperCase();
  // US Central abbreviations used by the scan feed; otherwise treat the
  // wall time as UTC rather than guessing the viewer's zone.
  const offset = upper === "CDT" ? "-05:00" : upper === "CST" ? "-06:00" : "Z";
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s || "00"}${offset}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function msUntilClose(deal, now = Date.now()) {
  const closes = parseClosesAt(deal.closesAt);
  if (!closes) return null;
  return closes.getTime() - now;
}

// "2d 4h", "3h 12m", "45m", "Closing now", "Closed", or "No close date".
export function formatCountdown(deal, now = Date.now()) {
  const ms = msUntilClose(deal, now);
  if (ms === null) return "No close date";
  if (ms <= 0) return "Closed";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return "Closing now";
}

// Active deal closing within `hours` (default 24) and not already closed.
export function isClosingSoon(deal, now = Date.now(), hours = 24) {
  if (!ACTIVE_STATUSES.includes(deal.status)) return false;
  const ms = msUntilClose(deal, now);
  return ms !== null && ms > 0 && ms <= hours * 3600000;
}

function slug(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Stable id so re-tracking the same lot updates instead of duplicating.
export function dealIdFromListing(row) {
  if (row.lot_url) return `url:${row.lot_url}`;
  return `lot:${slug(row.source)}:${slug(row.raw_model)}:${slug(row.closes_at)}`;
}

export function createDealFromListing(row) {
  const profit = Number(row.profit_per_unit);
  const maxBid = Number(row.max_bid_usd);
  return {
    id: dealIdFromListing(row),
    lot: row.raw_model || "Untitled lot",
    lotUrl: row.lot_url || "",
    source: row.source || "",
    qty: row.qty || "",
    condition: row.condition || "",
    verdict: String(row.verdict || "").toUpperCase(),
    profitPerUnit: Number.isFinite(profit) ? profit : null,
    suggestedMax: Number.isFinite(maxBid) ? Math.round(maxBid) : null,
    closesAt: row.closes_at || "",
    yourBid: null,
    outcomePrice: null,
    status: "watching",
    createdAt: new Date().toISOString(),
  };
}

export function summarizeDeals(deals, now = Date.now()) {
  const list = Array.isArray(deals) ? deals : [];
  const byStatus = { watching: 0, bidding: 0, won: 0, lost: 0, passed: 0 };
  let closingSoon = 0;
  for (const d of list) {
    if (d.status in byStatus) byStatus[d.status] += 1;
    if (isClosingSoon(d, now)) closingSoon += 1;
  }
  const tracked = byStatus.watching + byStatus.bidding;
  return { tracked, closingSoon, won: byStatus.won, byStatus, total: list.length };
}
