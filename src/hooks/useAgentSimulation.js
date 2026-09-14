import { useCallback, useEffect, useRef, useState } from "react";
import { AGENT_DEFS, SEED_SOURCE, seedAgent } from "../lib/agents";
import { rand } from "../lib/mockGenerators";
import { summarizeListings } from "../lib/listingsCsv";

const STORAGE_KEY = "mad:v1";
const MAX_STORED_ROWS = 200;
const TICK_MS = 2600;
const MAX_LOGS = 40;

function loadPersisted() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null; // storage unavailable or corrupt — start fresh
  }
}

function persistedRows() {
  const rows = loadPersisted()?.realListings;
  return Array.isArray(rows) && rows.length > 0 ? rows : null;
}

function initialAgents() {
  const persisted = loadPersisted();
  const agents = {};
  AGENT_DEFS.forEach((d) => {
    agents[d.id] = seedAgent(d);
    if (persisted?.statuses?.[d.id] === "paused") {
      agents[d.id].status = "paused";
    }
  });
  const rows = persistedRows();
  if (rows) {
    const stats = summarizeListings(rows);
    agents.evaluator.metrics = [stats.count, stats.matched, stats.avgMargin];
    agents.evaluator.logs = [
      {
        id: Date.now(),
        text: `Restored ${stats.count} real listings from previous session`,
        t: new Date(),
      },
    ];
  }
  return agents;
}

/**
 * Owns all simulation state: per-agent status/logs/metrics, the live ticker,
 * the uploaded real listings, and localStorage persistence of pause state +
 * listings across reloads.
 */
export function useAgentSimulation() {
  const [agents, setAgents] = useState(initialAgents);
  const [ticker, setTicker] = useState(["System online — 4 agents initialized"]);
  const [realListings, setRealListings] = useState(persistedRows);
  const lastSeedRef = useRef({});
  const prevTopLogs = useRef({});
  const lastSavedRef = useRef("");

  // Demo feed: one random running agent emits an event every tick.
  // The Evaluator stops emitting mock events once real listings are loaded.
  const tick = useCallback(() => {
    setAgents((prev) => {
      const eligible = AGENT_DEFS.filter((d) => {
        if (prev[d.id].status !== "running") return false;
        if (d.id === "evaluator" && realListings) return false;
        return true;
      });
      if (eligible.length === 0) return prev;

      const def = rand(eligible);
      const seed = SEED_SOURCE[def.id]
        ? lastSeedRef.current[SEED_SOURCE[def.id]]
        : undefined;
      const ev = def.gen(seed);
      lastSeedRef.current[def.id] = ev;

      const next = { ...prev };
      const agent = { ...next[def.id] };
      agent.logs = [
        { id: Date.now() + Math.random(), text: ev.text, t: new Date() },
        ...agent.logs,
      ].slice(0, MAX_LOGS);

      const m = [...agent.metrics];
      if (def.id === "finder") {
        m[0] += 1;
        m[1] += 1;
        if (Math.random() > 0.5) m[2] += 1;
      }
      if (def.id === "evaluator") {
        m[0] += 1;
        if (Math.random() > 0.6) m[1] += 1;
      }
      if (def.id === "buyer" && ev.text.startsWith("Offer sent")) m[0] += 1;
      if (def.id === "bookkeeper" && ev.text.startsWith("Purchase")) m[0] += 1;
      agent.metrics = m;
      next[def.id] = agent;
      return next;
    });
  }, [realListings]);

  useEffect(() => {
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [tick]);

  // Fold each agent's newest log line into the ticker.
  useEffect(() => {
    const newest = [];
    AGENT_DEFS.forEach((d) => {
      const top = agents[d.id].logs[0];
      if (top && prevTopLogs.current[d.id] !== top.id) {
        prevTopLogs.current[d.id] = top.id;
        newest.push(`${d.name.toUpperCase()} · ${top.text}`);
      }
    });
    if (newest.length) {
      setTicker((prev) => [...prev, ...newest].slice(-10));
    }
  }, [agents]);

  // Persist pause state + real listings; rehydrated on next load.
  useEffect(() => {
    const statuses = {};
    AGENT_DEFS.forEach((d) => {
      statuses[d.id] = agents[d.id].status;
    });
    const payload = JSON.stringify({
      statuses,
      realListings: realListings ? realListings.slice(0, MAX_STORED_ROWS) : null,
    });
    if (payload === lastSavedRef.current) return;
    lastSavedRef.current = payload;
    try {
      window.localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      // Storage full or unavailable — dashboard works fine without it.
    }
  });

  const toggleAgent = useCallback((id) => {
    setAgents((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        status: prev[id].status === "running" ? "paused" : "running",
      },
    }));
  }, []);

  const applyListings = useCallback((rows, sourceLabel) => {
    const stats = summarizeListings(rows);
    setRealListings(rows);
    setAgents((prev) => ({
      ...prev,
      evaluator: {
        ...prev.evaluator,
        logs: [
          {
            id: Date.now(),
            text: `Loaded ${stats.count} real listings from ${sourceLabel}`,
            t: new Date(),
          },
          ...prev.evaluator.logs,
        ],
        metrics: [stats.count, stats.matched, stats.avgMargin],
      },
    }));
    setTicker((prev) =>
      [...prev, `EVALUATOR · Loaded ${stats.count} real listings from ${sourceLabel}`].slice(-10)
    );
  }, []);

  const clearListings = useCallback(() => {
    setRealListings(null);
    setAgents((prev) => ({
      ...prev,
      evaluator: {
        ...prev.evaluator,
        logs: [
          {
            id: Date.now(),
            text: "Real listings cleared — back to simulated feed",
            t: new Date(),
          },
          ...prev.evaluator.logs,
        ],
        metrics: [0, 0, "$0"],
      },
    }));
    setTicker((prev) =>
      [...prev, "EVALUATOR · Real listings cleared — back to simulated feed"].slice(-10)
    );
  }, []);

  return { agents, ticker, realListings, toggleAgent, applyListings, clearListings };
}
