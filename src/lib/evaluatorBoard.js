// Evaluator board helpers: verdict filtering + profit sorting.
//
// The board can surface dozens of lots per scan as the Finder adds
// suppliers. By default SKIP verdicts are hidden and rows are sorted by
// profit per unit descending, so the actionable deals sit on top.

export const EVALUATOR_VERDICTS = ["BUY", "WATCH", "SKIP"];

// Default filter: show actionable lots, hide SKIP. The user can toggle
// each verdict chip to change this.
export const DEFAULT_VERDICT_FILTER = ["BUY", "WATCH"];

export function normalizeVerdict(row) {
  return String(row && row.verdict ? row.verdict : "")
    .trim()
    .toUpperCase();
}

export function profitPerUnit(row) {
  const n = Number(row ? row.profit_per_unit : undefined);
  return Number.isFinite(n) ? n : -Infinity;
}

// Filter rows to the selected verdicts, then sort by profit/unit desc.
// Rows with no verdict are never hidden by the filter (don't hide data
// the filter can't judge).
export function prepareEvaluatorRows(rows, selectedVerdicts) {
  const selected = new Set(
    (selectedVerdicts || []).map((v) => String(v).trim().toUpperCase())
  );
  const filtered = (rows || []).filter((row) => {
    const v = normalizeVerdict(row);
    if (!v) return true;
    return selected.has(v);
  });
  return [...filtered].sort((a, b) => profitPerUnit(b) - profitPerUnit(a));
}

// Count rows per known verdict (for the filter chip labels).
export function countVerdicts(rows) {
  const counts = { BUY: 0, WATCH: 0, SKIP: 0 };
  (rows || []).forEach((row) => {
    const v = normalizeVerdict(row);
    if (v in counts) counts[v] += 1;
  });
  return counts;
}
