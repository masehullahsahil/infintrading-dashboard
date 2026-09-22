import { describe, expect, it } from "vitest";
import {
  ACTIVE_STATUSES,
  DEAL_STATUSES,
  createDealFromListing,
  dealIdFromListing,
  formatCountdown,
  isClosingSoon,
  msUntilClose,
  parseClosesAt,
  summarizeDeals,
} from "./deals";

const NOW = new Date("2026-09-22T12:00:00-05:00").getTime();

function dealAt(isoLocal, status = "watching") {
  return { id: isoLocal, status, closesAt: isoLocal };
}

describe("deals", () => {
  it("parses the scan feed's closes_at format", () => {
    const d = parseClosesAt("2026-09-25 17:31 CDT");
    expect(d).not.toBeNull();
    // 17:31 CDT = 22:31 UTC
    expect(d.toISOString()).toBe("2026-09-25T22:31:00.000Z");
    expect(parseClosesAt("2026-09-25 17:31 CST").toISOString()).toBe(
      "2026-09-25T23:31:00.000Z"
    );
  });

  it("returns null for missing or garbage close dates", () => {
    expect(parseClosesAt("")).toBeNull();
    expect(parseClosesAt(null)).toBeNull();
    expect(parseClosesAt("not a date")).toBeNull();
  });

  it("formats countdowns", () => {
    expect(formatCountdown(dealAt("2026-09-25 17:31 CDT"), NOW)).toBe("3d 5h");
    expect(formatCountdown(dealAt("2026-09-22 15:00 CDT"), NOW)).toBe("3h 0m");
    expect(formatCountdown(dealAt("2026-09-22 12:30 CDT"), NOW)).toBe("30m");
    expect(formatCountdown(dealAt("2026-09-20 12:00 CDT"), NOW)).toBe("Closed");
    expect(formatCountdown({ id: "x", status: "watching", closesAt: "" }, NOW)).toBe(
      "No close date"
    );
  });

  it("flags closing-soon only for active deals within the window", () => {
    expect(isClosingSoon(dealAt("2026-09-23 10:00 CDT"), NOW)).toBe(true);
    expect(isClosingSoon(dealAt("2026-09-25 17:31 CDT"), NOW)).toBe(false);
    expect(isClosingSoon(dealAt("2026-09-20 12:00 CDT"), NOW)).toBe(false);
    expect(isClosingSoon(dealAt("2026-09-23 10:00 CDT", "won"), NOW)).toBe(false);
    expect(isClosingSoon({ id: "x", status: "watching", closesAt: "" }, NOW)).toBe(
      false
    );
  });

  it("creates stable deal ids from listings", () => {
    const row = {
      raw_model: "Lot #20664",
      source: "iBid IL",
      lot_url: "https://ibid.illinois.gov/item.php?id=417805",
      closes_at: "2026-09-25 17:31 CDT",
    };
    expect(dealIdFromListing(row)).toBe(
      "url:https://ibid.illinois.gov/item.php?id=417805"
    );
    const noUrl = { ...row, lot_url: "" };
    expect(dealIdFromListing(noUrl)).toBe(dealIdFromListing(noUrl));
  });

  it("creates a deal from an evaluator row", () => {
    const deal = createDealFromListing({
      raw_model: "Lot #20664 - Pallet",
      source: "iBid IL",
      qty: 260,
      condition: "untested",
      verdict: "buy",
      profit_per_unit: 63.76,
      max_bid_usd: 14393.95,
      closes_at: "2026-09-25 17:31 CDT",
      lot_url: "https://ibid.illinois.gov/item.php?id=417805",
    });
    expect(deal.status).toBe("watching");
    expect(deal.verdict).toBe("BUY");
    expect(deal.profitPerUnit).toBe(63.76);
    expect(deal.suggestedMax).toBe(14394);
    expect(deal.yourBid).toBeNull();
  });

  it("summarizes the pipeline", () => {
    const deals = [
      dealAt("2026-09-23 10:00 CDT", "watching"),
      dealAt("2026-09-25 17:31 CDT", "bidding"),
      dealAt("2026-09-25 17:31 CDT", "won"),
      dealAt("2026-09-20 12:00 CDT", "lost"),
    ];
    const s = summarizeDeals(deals, NOW);
    expect(s.tracked).toBe(2);
    expect(s.closingSoon).toBe(1);
    expect(s.won).toBe(1);
    expect(s.byStatus).toEqual({
      watching: 1,
      bidding: 1,
      won: 1,
      lost: 1,
      passed: 0,
    });
  });

  it("exposes the status lists", () => {
    expect(DEAL_STATUSES).toContain("watching");
    expect(ACTIVE_STATUSES).toEqual(["watching", "bidding"]);
  });

  it("msUntilClose returns null without a parseable date", () => {
    expect(msUntilClose({ closesAt: "" }, NOW)).toBeNull();
  });
});
