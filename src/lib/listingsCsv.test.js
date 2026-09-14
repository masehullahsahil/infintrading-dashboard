import { describe, it, expect } from "vitest";
import {
  parseListingsText,
  parseListingsFile,
  summarizeListings,
  REQUIRED_COLUMNS,
  MAX_CSV_BYTES,
} from "./listingsCsv";

const VALID_CSV = `brand,raw_model,cpu_family,gen,asking_price,estimated_resale,expected_profit,has_comp
Lenovo,ThinkPad X1 Carbon Gen9,i7,9,420,560,140,True
Dell,XPS 13 9310,i7,11,385,525,140,False
HP,EliteBook 840 G8,i5,11,310,430,120,TRUE
`;

describe("parseListingsText", () => {
  it("parses a valid CSV and computes stats", () => {
    const { rows, stats, warnings, error } = parseListingsText(VALID_CSV, "listings.csv");
    expect(error).toBeNull();
    expect(rows).toHaveLength(3);
    expect(rows[0].raw_model).toBe("ThinkPad X1 Carbon Gen9");
    expect(rows[0].asking_price).toBe(420); // dynamicTyping
    expect(stats).toEqual({ count: 3, matched: 2, avgMargin: "$133" });
    expect(warnings).toEqual([]);
  });

  it("rejects a CSV missing required columns", () => {
    const { rows, stats, error } = parseListingsText(
      "brand,model\nLenovo,X1\n",
      "bad.csv"
    );
    expect(error).toContain("Missing required column(s)");
    expect(error).toContain("raw_model");
    expect(error).toContain("asking_price");
    expect(rows).toEqual([]);
    expect(stats).toBeNull();
  });

  it("rejects empty input", () => {
    const { error } = parseListingsText("", "empty.csv");
    expect(error).toContain("No data rows found");
  });

  it("warns on missing optional columns but still parses", () => {
    const { rows, stats, warnings, error } = parseListingsText(
      "raw_model,asking_price\nThinkPad X1,420\n",
      "minimal.csv"
    );
    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    expect(stats.count).toBe(1);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("Missing optional column(s)");
  });

  it("never throws on garbage input", () => {
    expect(() => parseListingsText(",,,,,\n,,,,,\n", "junk.csv")).not.toThrow();
    // a single line becomes a header with zero data rows -> "no data rows"
    const { error } = parseListingsText("not a csv at all", "junk.csv");
    expect(error).toContain("No data rows found");
  });
});

describe("summarizeListings", () => {
  it("counts comps case-insensitively and averages margins", () => {
    const stats = summarizeListings([
      { has_comp: true, expected_profit: 100 },
      { has_comp: "True", expected_profit: 200 },
      { has_comp: "TRUE", expected_profit: 300 },
      { has_comp: false, expected_profit: 0 },
      { has_comp: "", expected_profit: "" },
    ]);
    expect(stats).toEqual({ count: 5, matched: 3, avgMargin: "$120" });
  });

  it("handles rows with no usable margins", () => {
    expect(summarizeListings([{ has_comp: false }]).avgMargin).toBe("$0");
  });
});

describe("parseListingsFile", () => {
  it("rejects oversized files without reading them", async () => {
    const file = { name: "huge.csv", size: MAX_CSV_BYTES + 1 };
    const { error } = await parseListingsFile(file);
    expect(error).toContain("limit is 5 MB");
  });

  it("handles a missing file", async () => {
    const { error } = await parseListingsFile(null);
    expect(error).toContain("No file selected");
  });
});

describe("column contract", () => {
  it("requires raw_model and asking_price", () => {
    expect(REQUIRED_COLUMNS).toEqual(
      expect.arrayContaining(["raw_model", "asking_price"])
    );
  });
});
