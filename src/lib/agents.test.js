import { describe, it, expect } from "vitest";
import { AGENT_DEFS, SEED_SOURCE, seedMetrics, seedAgent } from "./agents";
import { agentDataMode, DATA_MODE } from "./dataSource";

describe("agent definitions", () => {
  it("defines exactly four agents with unique ids", () => {
    const ids = AGENT_DEFS.map((d) => d.id);
    expect(ids).toEqual(["finder", "evaluator", "deals", "buyer"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every agent a role, icon, and three metric labels", () => {
    AGENT_DEFS.forEach((d) => {
      expect(typeof d.role).toBe("string");
      expect(d.metricLabels).toHaveLength(3);
    });
  });

  it("gives demo-feed agents a generator; the Deal Tracker has none (user state, never simulated)", () => {
    AGENT_DEFS.forEach((d) => {
      if (d.id === "deals") {
        expect(d.gen).toBeNull();
      } else {
        expect(typeof d.gen).toBe("function");
        const ev = d.gen(undefined);
        expect(typeof ev.text).toBe("string");
      }
    });
  });

  it("chains buyer <- evaluator seeds", () => {
    expect(SEED_SOURCE).toEqual({ buyer: "evaluator" });
  });
});

describe("seedMetrics / seedAgent", () => {
  it("seeds three metrics per agent", () => {
    AGENT_DEFS.forEach((d) => {
      expect(seedMetrics(d.id)).toHaveLength(3);
    });
  });

  it("starts agents running with empty logs", () => {
    const agent = seedAgent(AGENT_DEFS[0]);
    expect(agent.status).toBe("running");
    expect(agent.logs).toEqual([]);
  });
});

describe("agentDataMode", () => {
  it("keeps every feed-backed agent on the demo feed without its own real rows", () => {
    ["finder", "evaluator", "buyer"].forEach((id) => {
      expect(agentDataMode(id, { feeds: {} })).toBe(DATA_MODE.DEMO);
      expect(agentDataMode(id, { feeds: { [id]: null } })).toBe(DATA_MODE.DEMO);
      expect(agentDataMode(id, { feeds: { [id]: [] } })).toBe(DATA_MODE.DEMO);
    });
  });

  it("treats the Deal Tracker as live — it is user state, never a simulated feed", () => {
    expect(agentDataMode("deals", { feeds: {} })).toBe(DATA_MODE.LIVE);
    expect(agentDataMode("deals", { feeds: { deals: null } })).toBe(DATA_MODE.LIVE);
  });

  it("switches any feed-backed agent to live once its own feed has rows", () => {
    ["finder", "evaluator", "buyer"].forEach((id) => {
      expect(agentDataMode(id, { feeds: { [id]: [{}] } })).toBe(DATA_MODE.LIVE);
    });
  });

  it("never mixes feeds across agents", () => {
    expect(agentDataMode("buyer", { feeds: { evaluator: [{}] } })).toBe(DATA_MODE.DEMO);
    expect(agentDataMode("finder", { feeds: { buyer: [{}], deals: [{}] } })).toBe(
      DATA_MODE.DEMO
    );
  });
});
