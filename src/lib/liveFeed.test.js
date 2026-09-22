import { describe, expect, it, vi } from "vitest";
import { fetchLiveFeed, fetchLiveSuppliers, fetchLiveCandidates, liveIsNewer, LIVE_FEED_LISTINGS_URL } from "./liveFeed";

const GOOD_ROWS = [
  {
    brand: "Lenovo",
    raw_model: "Lot #20664 - Pallet of UNTESTED Lenovo Laptops",
    asking_price: 4050,
    estimated_resale: 23893.35,
    expected_profit: 16578.35,
    has_comp: true,
    verdict: "BUY",
  },
];

const GOOD_META = {
  scan_at: "2026-09-22T16:44:41+00:00",
  lots: 1,
  verdicts: { BUY: 1, WATCH: 0, SKIP: 0 },
};

function mockFetch({ listings = GOOD_ROWS, meta = GOOD_META, listingsOk = true, metaOk = true } = {}) {
  return vi.fn(async (url) => {
    if (url === LIVE_FEED_LISTINGS_URL) {
      return {
        ok: listingsOk,
        text: async () => (typeof listings === "string" ? listings : JSON.stringify(listings)),
      };
    }
    return {
      ok: metaOk,
      json: async () => meta,
    };
  });
}

describe("fetchLiveFeed", () => {
  it("returns validated rows and meta on success", async () => {
    const result = await fetchLiveFeed(mockFetch());
    expect(result).not.toBeNull();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].verdict).toBe("BUY");
    expect(result.meta.lots).toBe(1);
  });

  it("returns rows even when the meta fetch fails", async () => {
    const result = await fetchLiveFeed(mockFetch({ metaOk: false }));
    expect(result).not.toBeNull();
    expect(result.rows).toHaveLength(1);
    expect(result.meta).toBeNull();
  });

  it("returns null when listings are unreachable", async () => {
    const result = await fetchLiveFeed(mockFetch({ listingsOk: false }));
    expect(result).toBeNull();
  });

  it("returns null when fetch throws (offline)", async () => {
    const result = await fetchLiveFeed(async () => {
      throw new Error("network down");
    });
    expect(result).toBeNull();
  });

  it("returns null when listings fail contract validation", async () => {
    const result = await fetchLiveFeed(mockFetch({ listings: "not json at all" }));
    expect(result).toBeNull();
  });

  it("returns null when listings are an empty array", async () => {
    const result = await fetchLiveFeed(mockFetch({ listings: [] }));
    expect(result).toBeNull();
  });
});

describe("liveIsNewer", () => {
  const meta = { scan_at: "2026-09-22T16:44:41+00:00" };

  it("is true when there is no current feed", () => {
    expect(liveIsNewer(meta, null)).toBe(true);
  });

  it("is true when the current feed came from an upload", () => {
    expect(liveIsNewer(meta, { source: "upload", at: "2026-09-23T00:00:00+00:00" })).toBe(true);
  });

  it("is true when the live scan is newer than the live feed", () => {
    expect(
      liveIsNewer(meta, { source: "live", at: "2026-09-21T16:44:41+00:00" })
    ).toBe(true);
  });

  it("is false when the live feed is already current", () => {
    expect(
      liveIsNewer(meta, { source: "live", at: "2026-09-22T16:44:41+00:00" })
    ).toBe(false);
  });

  it("is false when meta has no timestamp", () => {
    expect(liveIsNewer({}, { source: "live", at: "2020-01-01T00:00:00+00:00" })).toBe(false);
    expect(liveIsNewer(null, null)).toBe(false);
  });
});

describe("fetchLiveSuppliers", () => {
  const GOOD_SUPPLIERS = [
    {
      supplier_name: "Illinois CMS iBid Electronics",
      supplier_type: "Government / Institutional",
      source_channel: "Public online auction",
      contact: "https://ibid.illinois.gov/",
      found_date: "2026-09-21",
      status: "active",
    },
  ];
  const mockSuppliersFetch = ({ rows = GOOD_SUPPLIERS, ok = true } = {}) =>
    vi.fn(async () => ({
      ok,
      text: async () => (typeof rows === "string" ? rows : JSON.stringify(rows)),
    }));

  it("returns validated supplier rows on success", async () => {
    const result = await fetchLiveSuppliers(mockSuppliersFetch());
    expect(result).not.toBeNull();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].supplier_name).toBe("Illinois CMS iBid Electronics");
  });

  it("returns null when the roster is unreachable", async () => {
    expect(await fetchLiveSuppliers(mockSuppliersFetch({ ok: false }))).toBeNull();
  });

  it("returns null when rows fail the finder contract", async () => {
    expect(await fetchLiveSuppliers(mockSuppliersFetch({ rows: "not json{{{" }))).toBeNull();
  });
});

describe("fetchLiveCandidates", () => {
  const GOOD_CANDIDATES = [
    { company: "GW Tech Parts", url: "https://gwtechparts.com/collections/all", status: "proposed" },
  ];
  const mockCandidatesFetch = ({ data = GOOD_CANDIDATES, ok = true } = {}) =>
    vi.fn(async () => ({
      ok,
      json: async () => data,
    }));

  it("returns the candidate array on success", async () => {
    const result = await fetchLiveCandidates(mockCandidatesFetch());
    expect(result).toHaveLength(1);
    expect(result[0].company).toBe("GW Tech Parts");
  });

  it("returns an empty array when there are no candidates", async () => {
    expect(await fetchLiveCandidates(mockCandidatesFetch({ data: [] }))).toEqual([]);
  });

  it("returns null when the feed is unreachable", async () => {
    expect(await fetchLiveCandidates(mockCandidatesFetch({ ok: false }))).toBeNull();
  });
});
