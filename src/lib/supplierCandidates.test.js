import { describe, it, expect } from "vitest";
import {
  candidateKey,
  candidateToSupplier,
  pendingCandidates,
  approvedSupplierRows,
  approveCandidate,
  dismissCandidate,
  EMPTY_CANDIDATE_DECISIONS,
} from "./supplierCandidates";

const A = {
  company: "GW Tech Parts",
  url: "https://gwtechparts.com/collections/all",
  type: "wholesaler",
  location: "Indianapolis IN, US",
  how_lots_sold: "listed prices",
  date_found: "2026-09-22",
  status: "proposed",
};
const B = {
  company: "Cal Auctions",
  url: "https://calauctions.com/",
  type: "auction house",
  location: "California, US",
  how_lots_sold: "public online auction",
  date_found: "2026-09-22",
  status: "proposed",
};

describe("candidateKey", () => {
  it("uses the lowercased URL as the stable key", () => {
    expect(candidateKey(A)).toBe("https://gwtechparts.com/collections/all");
    expect(candidateKey({ ...A, url: "HTTPS://GWTECHPARTS.COM/collections/all" })).toBe(
      "https://gwtechparts.com/collections/all"
    );
  });
  it("falls back to the company name when there is no URL", () => {
    expect(candidateKey({ company: "Foo Co", url: "" })).toBe("name:foo co");
  });
});

describe("candidateToSupplier", () => {
  it("maps candidate columns onto the roster columns, always under_review", () => {
    const row = candidateToSupplier(A);
    expect(row.supplier_name).toBe("GW Tech Parts");
    expect(row.supplier_type).toBe("wholesaler");
    expect(row.contact).toBe("https://gwtechparts.com/collections/all");
    expect(row.found_date).toBe("2026-09-22");
    expect(row.status).toBe("under_review");
    expect(row.source_channel).toContain("listed prices");
  });
});

describe("pendingCandidates / approve / dismiss", () => {
  it("returns all candidates when no decisions exist", () => {
    expect(pendingCandidates([A, B], EMPTY_CANDIDATE_DECISIONS)).toEqual([A, B]);
  });
  it("an approved candidate leaves the queue and joins the roster rows", () => {
    const d = approveCandidate(EMPTY_CANDIDATE_DECISIONS, A);
    expect(pendingCandidates([A, B], d)).toEqual([B]);
    const rows = approvedSupplierRows([A, B], d);
    expect(rows).toHaveLength(1);
    expect(rows[0].supplier_name).toBe("GW Tech Parts");
  });
  it("a dismissed candidate leaves the queue and never joins the roster", () => {
    const d = dismissCandidate(EMPTY_CANDIDATE_DECISIONS, B);
    expect(pendingCandidates([A, B], d)).toEqual([A]);
    expect(approvedSupplierRows([A, B], d)).toEqual([]);
  });
  it("decisions are idempotent", () => {
    const d = approveCandidate(approveCandidate(EMPTY_CANDIDATE_DECISIONS, A), A);
    expect(d.approved).toHaveLength(1);
  });
});
