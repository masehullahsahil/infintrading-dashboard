import { describe, expect, it } from "vitest";
import {
  DEFAULT_VERDICT_FILTER,
  EVALUATOR_VERDICTS,
  countVerdicts,
  normalizeVerdict,
  prepareEvaluatorRows,
  profitPerUnit,
} from "./evaluatorBoard";

const rows = [
  { verdict: "SKIP", profit_per_unit: 5, raw_model: "skip lot" },
  { verdict: "BUY", profit_per_unit: 60, raw_model: "buy lot" },
  { verdict: "WATCH", profit_per_unit: 16, raw_model: "watch lot" },
  { verdict: "BUY", profit_per_unit: 63, raw_model: "better buy" },
];

describe("evaluatorBoard", () => {
  it("exposes the three verdicts with BUY+WATCH as the default filter", () => {
    expect(EVALUATOR_VERDICTS).toEqual(["BUY", "WATCH", "SKIP"]);
    expect(DEFAULT_VERDICT_FILTER).toEqual(["BUY", "WATCH"]);
  });

  it("hides SKIP by default and sorts by profit/unit descending", () => {
    const out = prepareEvaluatorRows(rows, DEFAULT_VERDICT_FILTER);
    expect(out.map((r) => r.raw_model)).toEqual([
      "better buy",
      "buy lot",
      "watch lot",
    ]);
  });

  it("shows everything when all verdicts are selected", () => {
    const out = prepareEvaluatorRows(rows, EVALUATOR_VERDICTS);
    expect(out).toHaveLength(4);
    expect(out[0].raw_model).toBe("better buy");
    expect(out[3].raw_model).toBe("skip lot");
  });

  it("filters to a single verdict", () => {
    const out = prepareEvaluatorRows(rows, ["SKIP"]);
    expect(out.map((r) => r.raw_model)).toEqual(["skip lot"]);
  });

  it("never hides rows with no verdict", () => {
    const withBlank = [...rows, { profit_per_unit: 99, raw_model: "no verdict" }];
    const out = prepareEvaluatorRows(withBlank, ["SKIP"]);
    expect(out.map((r) => r.raw_model)).toEqual(["no verdict", "skip lot"]);
  });

  it("normalizes verdict casing and whitespace", () => {
    expect(normalizeVerdict({ verdict: " buy " })).toBe("BUY");
    expect(normalizeVerdict({})).toBe("");
    expect(normalizeVerdict(null)).toBe("");
  });

  it("treats missing profit as the lowest rank", () => {
    expect(profitPerUnit({})).toBe(-Infinity);
    expect(profitPerUnit({ profit_per_unit: "12.5" })).toBe(12.5);
    const out = prepareEvaluatorRows(
      [{ verdict: "BUY", raw_model: "a" }, { verdict: "BUY", profit_per_unit: 1, raw_model: "b" }],
      ["BUY"]
    );
    expect(out.map((r) => r.raw_model)).toEqual(["b", "a"]);
  });

  it("counts verdicts for the filter chips", () => {
    expect(countVerdicts(rows)).toEqual({ BUY: 2, WATCH: 1, SKIP: 1 });
    expect(countVerdicts([])).toEqual({ BUY: 0, WATCH: 0, SKIP: 0 });
  });
});
