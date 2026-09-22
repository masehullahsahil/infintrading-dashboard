import { describe, it, expect } from "vitest";
import {
  FEED_CONTRACTS,
  parseFeedText,
  parseFeedFile,
  STARTING_BUDGET_USD,
} from "./agentFeeds";
import { AGENT_DEFS } from "./agents";

const VALID_SUPPLIERS = `supplier_name,supplier_type,source_channel,contact,found_date,status
Summit Liquidators,Liquidation auction house,Liquidation auction lot,bids@x.example,2026-09-01,active
Vector Wholesale Group,B2B marketplace,Wholesale portal,sales@x.example,2026-09-02,under_review
Summit Liquidators,Liquidation auction house,Broker email,bids@x.example,2026-09-03,active
`;

const VALID_OFFERS = `model,asking_price,offer_price,status,seller,date
M1,400,360,accepted,S1,2026-01-01
M2,300,270,declined,S2,2026-01-02
M3,500,450,offer_sent,S3,2026-01-03
M4,250,230,no_response,S4,2026-01-04
`;

const VALID_LEDGER = `model,purchase_price,purchase_date,resale_price,fees,seller
A,100,2026-01-01,150,10,S1
B,200,2026-01-02,,,S2
`;

describe("feed contract registry", () => {
  it("covers exactly the four agents", () => {
    expect(Object.keys(FEED_CONTRACTS).sort()).toEqual(
      AGENT_DEFS.map((d) => d.id).sort()
    );
  });

  it("gives every contract a parser, summarizer, and table columns", () => {
    Object.values(FEED_CONTRACTS).forEach((c) => {
      expect(typeof c.parseText).toBe("function");
      expect(typeof c.summarize).toBe("function");
      expect(c.tableColumns.length).toBeGreaterThan(0);
      expect(c.expectedColumns).toContain(c.requiredColumns[0]);
    });
  });
});

describe("finder feed", () => {
  const c = FEED_CONTRACTS.finder;

  it("parses suppliers and summarizes roster metrics", () => {
    const { rows, stats, warnings, error } = c.parseText(VALID_SUPPLIERS, "suppliers.csv");
    expect(error).toBeNull();
    expect(warnings).toEqual([]);
    expect(rows).toHaveLength(3);
    expect(stats).toEqual([3, 2, 1]); // found, distinct roster, under review
  });

  it("rejects a file missing the required supplier_name column", () => {
    const { rows, stats, error } = c.parseText(
      "supplier_type\nLiquidation auction house\n",
      "bad.csv"
    );
    expect(error).toContain("Missing required column(s)");
    expect(error).toContain("supplier_name");
    expect(rows).toEqual([]);
    expect(stats).toBeNull();
  });

  it("rejects an invalid status enum value with the row number", () => {
    const { error } = c.parseText(
      "supplier_name,status\nAcme,maybe\n",
      "bad.csv"
    );
    expect(error).toContain("Row 1");
    expect(error).toContain("status");
    expect(error).toContain("active, under_review");
  });

  it("accepts a JSON array with the same field names", () => {
    const json = JSON.stringify([
      { supplier_name: "A", status: "active" },
      { supplier_name: "B", status: "under_review" },
    ]);
    const { rows, stats, error } = c.parseText(json, "suppliers.json");
    expect(error).toBeNull();
    expect(rows).toHaveLength(2);
    expect(stats).toEqual([2, 2, 1]);
  });

  it("warns on missing optional columns but still parses", () => {
    const { rows, warnings, error } = c.parseText(
      "supplier_name\nAcme\n",
      "minimal.csv"
    );
    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    expect(warnings[0]).toContain("Missing optional column(s)");
  });
});

describe("buyer feed", () => {
  const c = FEED_CONTRACTS.buyer;

  it("parses offers and computes accept rate over decided offers", () => {
    const { rows, stats, error } = c.parseText(VALID_OFFERS, "offers.csv");
    expect(error).toBeNull();
    expect(rows).toHaveLength(4);
    expect(rows[0].asking_price).toBe(400);
    expect(rows[0].status).toBe("accepted");
    expect(stats).toEqual([4, 2, "50%"]); // sent, active threads, accept rate
  });

  it("rejects a non-numeric price with the row number", () => {
    const { error } = c.parseText(
      "model,asking_price,offer_price,status\nM1,abc,360,accepted\n",
      "bad.csv"
    );
    expect(error).toContain("Row 1");
    expect(error).toContain("asking_price");
    expect(error).toContain("not a number");
  });

  it("rejects an empty required field", () => {
    const { error } = c.parseText(
      "model,asking_price,offer_price,status\n,400,360,accepted\n",
      "bad.csv"
    );
    expect(error).toContain("Row 1");
    expect(error).toContain("model");
  });

  it("shows a dash accept rate when nothing is decided yet", () => {
    const { stats } = c.parseText(
      "model,asking_price,offer_price,status\nM1,400,360,offer_sent\n",
      "open.csv"
    );
    expect(stats).toEqual([1, 1, "—"]);
  });
});

describe("bookkeeper feed", () => {
  const c = FEED_CONTRACTS.bookkeeper;

  it("computes units, budget remaining, and blended ROI on sold items", () => {
    const { rows, stats, error } = c.parseText(VALID_LEDGER, "ledger.csv");
    expect(error).toBeNull();
    expect(rows).toHaveLength(2);
    // spent 300 of the starting budget; sold A: profit 150-100-10=40 on cost 100
    expect(stats).toEqual([2, "$9,700", "40%"]);
    expect(STARTING_BUDGET_USD).toBe(10000);
  });

  it("tolerates $ and comma formatted prices", () => {
    const { rows, error } = c.parseText(
      'model,purchase_price\nA,"$1,240"\n',
      "money.csv"
    );
    expect(error).toBeNull();
    expect(rows[0].purchase_price).toBe(1240);
  });

  it("rejects a missing purchase_price column", () => {
    const { error } = c.parseText("model\nA\n", "bad.csv");
    expect(error).toContain("Missing required column(s)");
    expect(error).toContain("purchase_price");
  });

  it("shows a dash ROI when nothing is sold yet", () => {
    const { stats } = c.parseText(
      "model,purchase_price\nA,100\n",
      "unsold.csv"
    );
    expect(stats).toEqual([1, "$9,900", "—"]);
  });
});

describe("evaluator feed", () => {
  const c = FEED_CONTRACTS.evaluator;

  it("keeps the CSV path on the battle-tested listings parser", () => {
    const csv = `brand,raw_model,asking_price,expected_profit,has_comp
Lenovo,X1,420,140,True
Dell,XPS,385,140,False
HP,Elite,310,120,TRUE
`;
    const { rows, stats, error } = c.parseText(csv, "listings.csv");
    expect(error).toBeNull();
    expect(rows).toHaveLength(3);
    expect(stats).toEqual([3, 2, "$133"]);
  });

  it("accepts a JSON array through the generic contract validator", () => {
    const json = JSON.stringify([
      { raw_model: "X1", asking_price: 420, expected_profit: 140, has_comp: true },
      { raw_model: "XPS", asking_price: 385, expected_profit: 140, has_comp: false },
    ]);
    const { rows, stats, error } = c.parseText(json, "listings.json");
    expect(error).toBeNull();
    expect(rows).toHaveLength(2);
    expect(stats).toEqual([2, 1, "$140"]);
  });
});

describe("malformed input", () => {
  const c = FEED_CONTRACTS.buyer;

  it("rejects empty files", () => {
    expect(c.parseText("", "empty.csv").error).toContain("No data rows found");
    expect(c.parseText("[]", "empty.json").error).toContain("No data rows found");
  });

  it("rejects a JSON object that is not an array", () => {
    expect(c.parseText('{"a":1}', "bad.json").error).toContain("JSON array");
  });

  it("rejects unparseable JSON", () => {
    expect(c.parseText("[{bad", "bad.json").error).toContain("as JSON");
  });

  it("never throws on garbage input", () => {
    expect(() => c.parseText("not a csv at all", "junk.csv")).not.toThrow();
    expect(() => c.parseText(",,,,,\n,,,,,\n", "junk.csv")).not.toThrow();
  });
});

describe("parseFeedText via registry", () => {
  it("is reachable through parseFeedText with an explicit contract", () => {
    const { rows, error } = parseFeedText(
      VALID_SUPPLIERS,
      "suppliers.csv",
      FEED_CONTRACTS.finder
    );
    expect(error).toBeNull();
    expect(rows).toHaveLength(3);
  });
});

describe("parseFeedFile", () => {
  it("rejects oversized files without reading them", async () => {
    const file = { name: "huge.csv", size: 6 * 1024 * 1024 };
    const { rows, error } = await parseFeedFile(file, "buyer");
    expect(rows).toEqual([]);
    expect(error).toContain("limit is 5 MB");
  });

  it("rejects an unknown feed id", async () => {
    const { error } = await parseFeedFile(null, "nonexistent");
    expect(error).toContain("Unknown feed");
  });

  it("handles a missing file", async () => {
    const { error } = await parseFeedFile(null, "buyer");
    expect(error).toContain("No file selected");
  });
});

describe("evaluator table columns", () => {
  const keys = FEED_CONTRACTS.evaluator.tableColumns.map((c) => c.key);

  it("shows where the lot is, when it closes, and the verdict up front", () => {
    for (const key of ["verdict", "source", "qty", "condition", "closes_at"]) {
      expect(keys).toContain(key);
    }
    expect(keys.indexOf("verdict")).toBeLessThan(keys.indexOf("asking_price"));
  });

  it("links the lot title to its auction page", () => {
    const lot = FEED_CONTRACTS.evaluator.tableColumns.find((c) => c.key === "raw_model");
    expect(lot.link).toBe("lot_url");
  });
});
