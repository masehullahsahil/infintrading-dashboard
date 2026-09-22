import { describe, it, expect } from "vitest";
import { formatMetric } from "./format";

describe("formatMetric", () => {
  it("adds thousands separators to plain numbers", () => {
    expect(formatMetric(11)).toBe("11");
    expect(formatMetric(1240)).toBe("1,240");
    expect(formatMetric(1000000)).toBe("1,000,000");
  });

  it("passes pre-formatted strings through untouched", () => {
    expect(formatMetric("$1,240")).toBe("$1,240");
    expect(formatMetric("41%")).toBe("41%");
    expect(formatMetric("—")).toBe("—");
  });

  it("passes non-finite numbers through rather than mangling them", () => {
    expect(formatMetric(NaN)).toBe(NaN);
    expect(formatMetric(Infinity)).toBe(Infinity);
  });
});
