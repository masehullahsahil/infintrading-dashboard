// Supplier candidate review queue: helpers for the Finder's "new candidates"
// panel. Candidates arrive via the live feed (candidates.json, status
// "proposed"). Approving merges a candidate into the roster view as
// under_review; dismissing hides it. Decisions are the operator's own state
// (like tracked deals) and never change the canonical feed files.

/** Stable identity for a candidate: its URL, falling back to the company name. */
export function candidateKey(c) {
  const url = (c.url || "").trim().toLowerCase();
  if (url) return url;
  return `name:${(c.company || "").trim().toLowerCase()}`;
}

/**
 * Map a candidate row onto the finder feed's supplier columns so an approved
 * candidate renders in the roster table. Always under_review — the operator
 * flips it to active after vetting.
 */
export function candidateToSupplier(c) {
  const location = (c.location || "").trim();
  const how = (c.how_lots_sold || "").trim();
  return {
    supplier_name: c.company || "",
    supplier_type: c.type || "",
    source_channel: location && how ? `${how} · ${location}` : how || location,
    contact: c.url || "",
    found_date: c.date_found || "",
    status: "under_review",
  };
}

/** Candidates the operator hasn't decided on yet. */
export function pendingCandidates(candidates, decisions) {
  const dismissed = new Set(decisions.dismissed || []);
  const approved = new Set(decisions.approved || []);
  return (candidates || []).filter((c) => {
    const k = candidateKey(c);
    return !dismissed.has(k) && !approved.has(k);
  });
}

/** Supplier rows for approved candidates, ready to append to the roster view. */
export function approvedSupplierRows(candidates, decisions) {
  const approved = new Set(decisions.approved || []);
  return (candidates || [])
    .filter((c) => approved.has(candidateKey(c)))
    .map(candidateToSupplier);
}

export function approveCandidate(decisions, candidate) {
  const k = candidateKey(candidate);
  const approved = [...(decisions.approved || [])];
  if (!approved.includes(k)) approved.push(k);
  return { ...decisions, approved };
}

export function dismissCandidate(decisions, candidate) {
  const k = candidateKey(candidate);
  const dismissed = [...(decisions.dismissed || [])];
  if (!dismissed.includes(k)) dismissed.push(k);
  return { ...decisions, dismissed };
}

export const EMPTY_CANDIDATE_DECISIONS = { approved: [], dismissed: [] };
