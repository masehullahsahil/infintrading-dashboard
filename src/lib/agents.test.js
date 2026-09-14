import { describe, it, expect } from "vitest";
import { AGENT_DEFS, SEED_SOURCE, seedMetrics, seedAgent } from "./agents";
import { agentDataMode, DATA_MODE } from "./dataSource";

describe("agent definitions", () => {
  it("defines exactly four agents with unique ids", () => {
    const ids = AGENT_DEFS.map((d) => d.id);
    expect(ids).toEqual(["finder", "evaluator", "buyer", "bookkeeper"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every agent a generator, role, icon, and three metric labels", () => {
    AGENT_DEFS.forEach((d) => {
      expect(typeof d.gen).toBe("function");
      expect(typeof d.role).toBe("string");
      expect(d.metricLabels).toHaveLength(3);
      const ev = d.gen(undefined);
      expect(typeof ev.text).toBe("string");
    });
  });

  it("chains buyer <- evaluator and bookkeeper <- buyer seeds", () => {
    expect(SEED_SOURCE).toEqual({ buyer: "evaluator", bookkeeper: "buyer" });
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
  it("keeps every agent on the demo feed without its own real rows", () => {
    ["finder", "evaluator", "buyer", "bookkeeper"].forEach((id) => {
      expect(agentDataMode(id, { feeds: {} })).toBe(DATA_MODE.DEMO);
      expect(agentDataMode(id, { feeds: { [id]: null } })).toBe(DATA_MODE.DEMO);
      expect(agentDataMode(id, { feeds: { [id]: [] } })).toBe(DATA_MODE.DEMO);
    });
  });

  it("switches any agent to live once its own feed has rows", () => {
    ["finder", "evaluator", "buyer", "bookkeeper"].forEach((id) => {
      expect(agentDataMode(id, { feeds: { [id]: [{}] } })).toBe(DATA_MODE.LIVE);
    });
  });

  it("never mixes feeds across agents", () => {
    expect(agentDataMode("buyer", { feeds: { evaluator: [{}] } })).toBe(DATA_MODE.DEMO);
    expect(agentDataMode("finder", { feeds: { buyer: [{}], bookkeeper: [{}] } })).toBe(
      DATA_MODE.DEMO
    );
  });
});
