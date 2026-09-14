// Parsing, validation, and stats for the Evaluator's listings.csv upload.
// Kept UI-free so it can be unit-tested; the component layer in
// EvaluatorPage.jsx only renders the { rows, stats, warnings, error } result.

import Papa from "papaparse";

export const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5 MB

export const EXPECTED_COLUMNS = [
  "brand",
  "raw_model",
  "cpu_family",
  "gen",
  "asking_price",
  "estimated_resale",
  "expected_profit",
  "has_comp",
];

// Columns without which the dashboard cannot do anything useful.
export const REQUIRED_COLUMNS = ["raw_model", "asking_price"];

function isCompTrue(value) {
  return value === true || String(value).trim().toLowerCase() === "true";
}

/** Aggregate stats shown on the Evaluator's metric cards. */
export function summarizeListings(rows) {
  const matched = rows.filter((r) => isCompTrue(r.has_comp)).length;
  const margins = rows
    .map((r) => Number(r.expected_profit))
    .filter((v) => !Number.isNaN(v));
  const avgMargin = margins.length
    ? "$" + Math.round(margins.reduce((a, b) => a + b, 0) / margins.length)
    : "$0";
  return { count: rows.length, matched, avgMargin };
}

function emptyResult(error) {
  return { rows: [], stats: null, warnings: [], error };
}

/**
 * Parse CSV text into listings. Never throws — problems come back as `error`.
 * @returns {{ rows: object[], stats: {count, matched, avgMargin} | null, warnings: string[], error: string | null }}
 */
export function parseListingsText(csvText, fileName = "listings.csv") {
  let parsed;
  try {
    parsed = Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });
  } catch (err) {
    return emptyResult(`Could not parse ${fileName}: ${err.message}`);
  }

  const rows = (parsed.data || []).filter((r) => r && typeof r === "object");
  if (rows.length === 0) {
    return emptyResult(
      `No data rows found in ${fileName}. Expected a header row plus at least one listing.`
    );
  }

  const fields = parsed.meta?.fields || [];
  const missingRequired = REQUIRED_COLUMNS.filter((c) => !fields.includes(c));
  if (missingRequired.length > 0) {
    return emptyResult(
      `Missing required column(s): ${missingRequired.join(", ")}. ` +
        `Expected columns: ${EXPECTED_COLUMNS.join(", ")}.`
    );
  }

  const warnings = [];
  const missingOptional = EXPECTED_COLUMNS.filter(
    (c) => !REQUIRED_COLUMNS.includes(c) && !fields.includes(c)
  );
  if (missingOptional.length > 0) {
    warnings.push(
      `Missing optional column(s): ${missingOptional.join(", ")} — related table cells will show as blank.`
    );
  }
  const rowErrors = (parsed.errors || []).filter((e) => e.row !== undefined);
  if (rowErrors.length > 0) {
    warnings.push(
      `${rowErrors.length} row(s) had parse issues and may be incomplete (first: row ${rowErrors[0].row + 1}).`
    );
  }

  return { rows, stats: summarizeListings(rows), warnings, error: null };
}

/**
 * Read a File object and parse it as listings CSV.
 * @returns {Promise<{ rows: object[], stats: object | null, warnings: string[], error: string | null }>}
 */
export function parseListingsFile(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve(emptyResult("No file selected."));
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      resolve(
        emptyResult(
          `“${file.name}” is ${(file.size / 1048576).toFixed(1)} MB — the limit is 5 MB.`
        )
      );
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => resolve(emptyResult(`Could not read “${file.name}”.`));
    reader.onload = () =>
      resolve(parseListingsText(String(reader.result || ""), file.name));
    reader.readAsText(file);
  });
}
