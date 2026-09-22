import { describe, it, expect } from "vitest";
import {
  finderEvent,
  evaluatorMockEvent,
  buyerEvent,
  MODELS,
} from "./mockGenerators";

describe("mock event generators", () => {
  it("finderEvent names a supplier and a type", () => {
    const ev = finderEvent();
    expect(ev.text).toContain("New supplier found:");
    expect(ev.text).toContain(ev.name);
    expect(ev.text).toContain(ev.type);
  });

  it("evaluatorMockEvent keeps margin math consistent", () => {
    for (let i = 0; i < 50; i++) {
      const ev = evaluatorMockEvent();
      expect(MODELS).toContain(ev.model);
      expect(ev.price).toBeGreaterThanOrEqual(180);
      expect(ev.price).toBeLessThan(620);
      expect(ev.text).toContain(`$${ev.price}`);
      // resale = price + margin with margin in [40, 200)
      const resale = Number(ev.text.match(/est\. resale \$(\d+)/)[1]);
      const margin = Number(ev.text.match(/margin \$(\d+)/)[1]);
      expect(resale - ev.price).toBe(margin);
      expect(margin).toBeGreaterThanOrEqual(40);
      expect(margin).toBeLessThan(200);
    }
  });

  it("buyerEvent never offers above asking", () => {
    for (let i = 0; i < 50; i++) {
      const ev = buyerEvent({ model: "ThinkPad X1", price: 400 });
      expect(ev.model).toBe("ThinkPad X1");
      expect(ev.offer).toBeLessThanOrEqual(400);
      expect(ev.offer).toBeGreaterThanOrEqual(60);
    }
  });

  it("buyerEvent falls back to random model/price without a seed", () => {
    const ev = buyerEvent(undefined);
    expect(typeof ev.text).toBe("string");
    expect(ev.text.length).toBeGreaterThan(0);
  });
});
