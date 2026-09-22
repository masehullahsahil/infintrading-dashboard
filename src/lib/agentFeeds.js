// Real-data feed contracts for every agent.
//
// Each contract describes the file an operator can upload to switch that
// agent from the simulated demo feed to real data:
//   - expectedColumns / requiredColumns: the documented schema
//   - numericColumns: must parse as finite numbers (blank allowed only when
//     the column itself is optional; "$1,240" style input is tolerated)
//   - enumColumns: { column: [allowed values] }, matched case-insensitively
//   - summarize(rows): the three metric-card values shown for the agent
//   - tableColumns: how FeedTable renders the rows
//   - recordNoun: used in log lines, e.g. "Loaded 6 real offers from …"
//
// Files may be CSV (header row + data rows) or a JSON array of objects using
// the same field names. Validation never throws: structural problems come
// back as `error` and the file is REJECTED — nothing is applied, the agent
// stays on whatever feed it had, and there is no silent fallback to
// simulated data. Minor issues come back as `warnings` and the file is
// accepted with the caveats shown in the UI.
//
// A rejected file never reaches the live dataset, and simulated rows are
// never merged into a live dataset: each agent shows exactly one feed.

import Papa from "papaparse";
import { readFeedFile } from "./feedFile";
import {
  parseListingsText,
  summarizeListings,
  EXPECTED_COLUMNS as LISTING_EXPECTED_COLUMNS,
  REQUIRED_COLUMNS as LISTING_REQUIRED_COLUMNS,
} from "./listingsCsv";

export function looksLikeJson(text) {
  return text.trimStart().startsWith("[");
}

function emptyFeedResult(error) {
  return { rows: [], stats: null, warnings: [], error };
}

/** Extract raw rows plus header/key fields from CSV or a JSON array. */
function extractRows(text, fileName) {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    let arr;
    try {
      arr = JSON.parse(text);
    } catch (err) {
      return {
        rows: [],
        fields: [],
        warnings: [],
        error: `Could not parse ${fileName} as JSON: ${err.message}`,
      };
    }
    if (!Array.isArray(arr)) {
      return {
        rows: [],
        fields: [],
        warnings: [],
        error: `${fileName} must contain a JSON array of objects.`,
      };
    }
    const rows = arr.filter((r) => r && typeof r === "object" && !Array.isArray(r));
    if (rows.length === 0) {
      return {
        rows: [],
        fields: [],
        warnings: [],
        error: `No data rows found in ${fileName}. Expected a JSON array with at least one object.`,
      };
    }
    const fields = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    return { rows, fields, warnings: [], error: null };
  }

  let parsed;
  try {
    parsed = Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });
  } catch (err) {
    return {
      rows: [],
      fields: [],
      warnings: [],
      error: `Could not parse ${fileName}: ${err.message}`,
    };
  }
  const rows = (parsed.data || []).filter((r) => r && typeof r === "object");
  if (rows.length === 0) {
    return {
      rows: [],
      fields: [],
      warnings: [],
      error: `No data rows found in ${fileName}. Expected a header row plus at least one data row.`,
    };
  }
  const warnings = [];
  const rowErrors = (parsed.errors || []).filter((e) => e.row !== undefined);
  if (rowErrors.length > 0) {
    warnings.push(
      `${rowErrors.length} row(s) had parse issues and may be incomplete (first: row ${rowErrors[0].row + 1}).`
    );
  }
  return { rows, fields: parsed.meta?.fields || [], warnings, error: null };
}

function parseMoneyish(value) {
  // Tolerate "$1,240" style values pasted from spreadsheets.
  const num = Number(String(value).trim().replace(/[$,]/g, ""));
  return Number.isFinite(num) ? num : null;
}

/**
 * Validate rows against the contract. Normalizes numerics to numbers and
 * enums to lowercase in place. Returns { warnings, error } — an error
 * rejects the whole file so the operator fixes it and re-uploads.
 */
function validateRows(rows, fields, contract, fileName) {
  const missingRequired = contract.requiredColumns.filter(
    (c) => !fields.includes(c)
  );
  if (missingRequired.length > 0) {
    return {
      error:
        `Missing required column(s): ${missingRequired.join(", ")}. ` +
        `Expected columns: ${contract.expectedColumns.join(", ")}.`,
    };
  }

  const warnings = [];
  const missingOptional = contract.expectedColumns.filter(
    (c) => !contract.requiredColumns.includes(c) && !fields.includes(c)
  );
  if (missingOptional.length > 0) {
    warnings.push(
      `Missing optional column(s): ${missingOptional.join(", ")} — related table cells will show as blank.`
    );
  }

  const problems = [];
  rows.forEach((row, i) => {
    const n = i + 1; // 1-based data-row number
    for (const col of contract.requiredColumns) {
      const v = row[col];
      if (v === null || v === undefined || String(v).trim() === "") {
        problems.push(`Row ${n}: “${col}” is required but empty`);
        return;
      }
    }
    for (const col of contract.numericColumns) {
      const v = row[col];
      if (v === null || v === undefined || String(v).trim() === "") {
        row[col] = null; // blank optional numeric stays blank
        continue;
      }
      const num =
        typeof v === "number" ? (Number.isFinite(v) ? v : null) : parseMoneyish(v);
      if (num === null) {
        problems.push(`Row ${n}: “${col}” (“${v}”) is not a number`);
        return;
      }
      row[col] = num;
    }
    for (const [col, allowed] of Object.entries(contract.enumColumns)) {
      const v = row[col];
      if (v === null || v === undefined || String(v).trim() === "") continue;
      const norm = String(v).trim().toLowerCase();
      if (!allowed.includes(norm)) {
        problems.push(
          `Row ${n}: “${col}” (“${v}”) must be one of: ${allowed.join(", ")}`
        );
        return;
      }
      row[col] = norm;
    }
  });

  if (problems.length > 0) {
    const shown = problems.slice(0, 3).join("; ");
    const more = problems.length > 3 ? ` (+${problems.length - 3} more)` : "";
    return {
      error: `${problems.length} invalid row(s) in ${fileName} — fix and re-upload. First problems: ${shown}${more}`,
    };
  }
  return { warnings, error: null };
}

/**
 * Parse feed text (CSV or JSON) against a contract. Never throws.
 * @returns {{ rows: object[], stats: any, warnings: string[], error: string | null }}
 */
export function parseFeedText(text, fileName, contract) {
  const extracted = extractRows(text, fileName);
  if (extracted.error) return emptyFeedResult(extracted.error);
  const checked = validateRows(extracted.rows, extracted.fields, contract, fileName);
  if (checked.error) return emptyFeedResult(checked.error);
  return {
    rows: extracted.rows,
    stats: contract.summarize(extracted.rows),
    warnings: [...extracted.warnings, ...checked.warnings],
    error: null,
  };
}

// --- Per-agent summarizers: rows -> the agent's three metric-card values ---

function summarizeSuppliers(rows) {
  const roster = new Set(
    rows.map((r) => String(r.supplier_name).trim().toLowerCase())
  ).size;
  const underReview = rows.filter(
    (r) => (r.status || "active") === "under_review"
  ).length;
  return [rows.length, roster, underReview];
}

const ACTIVE_OFFER_STATUSES = new Set(["offer_sent", "countered", "no_response"]);

function summarizeOffers(rows) {
  const active = rows.filter((r) => ACTIVE_OFFER_STATUSES.has(r.status)).length;
  const accepted = rows.filter((r) => r.status === "accepted").length;
  const declined = rows.filter((r) => r.status === "declined").length;
  const decided = accepted + declined;
  const rate = decided > 0 ? `${Math.round((accepted / decided) * 100)}%` : "—";
  return [rows.length, active, rate];
}

/** Starting cash the Bookkeeper measures spend against (documented in README). */
export const STARTING_BUDGET_USD = 10000;

function formatMoney(usd) {
  const sign = usd < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(usd)).toLocaleString("en-US")}`;
}

function summarizeLedger(rows) {
  const spent = rows.reduce((sum, r) => sum + r.purchase_price, 0);
  const sold = rows.filter((r) => r.resale_price !== null);
  const soldCost = sold.reduce((sum, r) => sum + r.purchase_price, 0);
  const profit = sold.reduce(
    (sum, r) => sum + r.resale_price - r.purchase_price - (r.fees || 0),
    0
  );
  const roi = soldCost > 0 ? `${Math.round((profit / soldCost) * 100)}%` : "—";
  return [rows.length, formatMoney(STARTING_BUDGET_USD - spent), roi];
}

function summarizeEvaluator(rows) {
  const s = summarizeListings(rows);
  return [s.count, s.matched, s.avgMargin];
}

export const FEED_CONTRACTS = {
  finder: {
    id: "finder",
    fileLabel: "suppliers.csv",
    accept: ".csv,.json,text/csv,application/json",
    recordNoun: "suppliers",
    expectedColumns: [
      "supplier_name",
      "supplier_type",
      "source_channel",
      "contact",
      "found_date",
      "status",
    ],
    requiredColumns: ["supplier_name"],
    numericColumns: [],
    enumColumns: { status: ["active", "under_review"] },
    tableColumns: [
      { key: "supplier_name", label: "Supplier" },
      { key: "supplier_type", label: "Type" },
      { key: "source_channel", label: "Source" },
      { key: "contact", label: "Contact" },
      { key: "found_date", label: "Found" },
      { key: "status", label: "Status" },
    ],
    summarize: summarizeSuppliers,
    parseText: (text, fileName) =>
      parseFeedText(text, fileName, FEED_CONTRACTS.finder),
  },
  evaluator: {
    id: "evaluator",
    fileLabel: "listings.csv",
    accept: ".csv,.json,text/csv,application/json",
    recordNoun: "listings",
    expectedColumns: LISTING_EXPECTED_COLUMNS,
    requiredColumns: LISTING_REQUIRED_COLUMNS,
    numericColumns: ["asking_price", "estimated_resale", "expected_profit"],
    enumColumns: {},
    tableColumns: [
      { key: "verdict", label: "Verdict" },
      { key: "source", label: "Source" },
      { key: "raw_model", label: "Lot", link: "lot_url" },
      { key: "qty", label: "Qty" },
      { key: "condition", label: "Condition" },
      { key: "asking_price", label: "Asking", money: true },
      { key: "profit_per_unit", label: "Profit/u", money: true },
      { key: "max_bid_usd", label: "Max bid", money: true },
      { key: "closes_at", label: "Closes" },
      { key: "brand", label: "Brand" },
      { key: "estimated_resale", label: "Est. Resale", money: true },
      { key: "expected_profit", label: "Margin", money: true },
      { key: "has_comp", label: "Comp?", bool: true },
    ],
    summarize: summarizeEvaluator,
    // CSV keeps the battle-tested listings parser; JSON goes through the
    // generic contract validator with the same schema. Either way, `stats`
    // comes back as this contract's metric values.
    parseText: (text, fileName) => {
      if (looksLikeJson(text)) {
        return parseFeedText(text, fileName, FEED_CONTRACTS.evaluator);
      }
      const parsed = parseListingsText(text, fileName);
      if (parsed.error) return parsed;
      return { ...parsed, stats: FEED_CONTRACTS.evaluator.summarize(parsed.rows) };
    },
  },
  buyer: {
    id: "buyer",
    fileLabel: "offers.csv",
    accept: ".csv,.json,text/csv,application/json",
    recordNoun: "offers",
    expectedColumns: [
      "model",
      "asking_price",
      "offer_price",
      "status",
      "seller",
      "date",
    ],
    requiredColumns: ["model", "asking_price", "offer_price", "status"],
    numericColumns: ["asking_price", "offer_price"],
    enumColumns: {
      status: ["offer_sent", "countered", "accepted", "declined", "no_response"],
    },
    tableColumns: [
      { key: "model", label: "Model" },
      { key: "asking_price", label: "Asking", money: true },
      { key: "offer_price", label: "Offer", money: true },
      { key: "status", label: "Status" },
      { key: "seller", label: "Seller" },
      { key: "date", label: "Date" },
    ],
    summarize: summarizeOffers,
    parseText: (text, fileName) =>
      parseFeedText(text, fileName, FEED_CONTRACTS.buyer),
  },
  bookkeeper: {
    id: "bookkeeper",
    fileLabel: "ledger.csv",
    accept: ".csv,.json,text/csv,application/json",
    recordNoun: "ledger entries",
    expectedColumns: [
      "model",
      "purchase_price",
      "purchase_date",
      "resale_price",
      "fees",
      "seller",
    ],
    requiredColumns: ["model", "purchase_price"],
    numericColumns: ["purchase_price", "resale_price", "fees"],
    enumColumns: {},
    tableColumns: [
      { key: "model", label: "Model" },
      { key: "purchase_price", label: "Paid", money: true },
      { key: "purchase_date", label: "Purchased" },
      { key: "resale_price", label: "Resold", money: true },
      { key: "fees", label: "Fees", money: true },
      { key: "seller", label: "Seller" },
    ],
    summarize: summarizeLedger,
    parseText: (text, fileName) =>
      parseFeedText(text, fileName, FEED_CONTRACTS.bookkeeper),
  },
};

/**
 * Read a File object and parse it against an agent's feed contract.
 * @returns {Promise<{ rows: object[], stats: any, warnings: string[], error: string | null }>}
 */
export async function parseFeedFile(file, contractId) {
  const contract = FEED_CONTRACTS[contractId];
  if (!contract) return emptyFeedResult(`Unknown feed: ${contractId}`);
  const { text, error } = await readFeedFile(file);
  if (error) return emptyFeedResult(error);
  return contract.parseText(text, file.name);
}
