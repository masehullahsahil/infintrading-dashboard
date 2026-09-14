import { useCallback, useEffect, useRef, useState } from "react";
import { AGENT_DEFS, SEED_SOURCE, seedAgent, seedMetrics } from "../lib/agents";
import { rand } from "../lib/mockGenerators";
import { FEED_CONTRACTS } from "../lib/agentFeeds";

const STORAGE_KEY = "mad:v2";
const LEGACY_STORAGE_KEY = "mad:v1";
const MAX_STORED_ROWS = 200;
const TICK_MS = 2600;
const MAX_LOGS = 40;

const EMPTY_FEEDS = {
  finder: null,
  evaluator: null,
  buyer: null,
  bookkeeper: null,
};

function loadStored(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null; // storage unavailable or corrupt — start fresh
  }
}

function sanitizedFeed(rows) {
  return Array.isArray(rows) && rows.length > 0 ? rows : null;
}

/**
 * Real-data feeds rehydrated from storage. Migrates the old v1 payload
 * (evaluator-only `realListings`) into the new per-agent `feeds` shape.
 */
function loadFeeds() {
  const v2 = loadStored(STORAGE_KEY);
  if (v2 && v2.feeds && typeof v2.feeds === "object") {
    const feeds = { ...EMPTY_FEEDS };
    for (const id of Object.keys(feeds)) feeds[id] = sanitizedFeed(v2.feeds[id]);
    return feeds;
  }
  const v1 = loadStored(LEGACY_STORAGE_KEY);
  if (v1) {
    return { ...EMPTY_FEEDS, evaluator: sanitizedFeed(v1.realListings) };
  }
  return { ...EMPTY_FEEDS };
}

function loadStatuses() {
  return (
    loadStored(STORAGE_KEY)?.statuses ?? loadStored(LEGACY_STORAGE_KEY)?.statuses ?? null
  );
}

function initialState() {
  const feeds = loadFeeds();
  const statuses = loadStatuses();
  const agents = {};
  AGENT_DEFS.forEach((d) => {
    agents[d.id] = seedAgent(d);
    if (statuses?.[d.id] === "paused") {
      agents[d.id].status = "paused";
    }
    const rows = feeds[d.id];
    if (rows) {
      const contract = FEED_CONTRACTS[d.id];
      agents[d.id].metrics = contract.summarize(rows);
      agents[d.id].logs = [
        {
          id: Date.now(),
          text: `Restored ${rows.length} real ${contract.recordNoun} from previous session`,
          t: new Date(),
        },
      ];
    }
  });
  return { agents, feeds };
}

/**
 * Owns all simulation state: per-agent status/logs/metrics, the live ticker,
 * the uploaded real-data feeds, and localStorage persistence of pause state +
 * feeds across reloads.
 */
export function useAgentSimulation() {
  const [boot] = useState(initialState);
  const [agents, setAgents] = useState(boot.agents);
  const [feeds, setFeeds] = useState(boot.feeds);
  const [ticker, setTicker] = useState(["System online — 4 agents initialized"]);
  const lastSeedRef = useRef({});
  const prevTopLogs = useRef({});
  const lastSavedRef = useRef("");

  // Demo feed: one random running agent emits an event every tick.
  // An agent stops emitting mock events once its real feed is loaded, so
  // simulated rows never mix into a live dataset.
  const tick = useCallback(() => {
    setAgents((prev) => {
      const eligible = AGENT_DEFS.filter((d) => {
        if (prev[d.id].status !== "running") return false;
        const live = feeds[d.id] && feeds[d.id].length > 0;
        if (live) return false;
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
  }, [feeds]);

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

  // Persist pause state + real feeds; rehydrated on next load.
  useEffect(() => {
    const statuses = {};
    const storedFeeds = {};
    AGENT_DEFS.forEach((d) => {
      statuses[d.id] = agents[d.id].status;
      storedFeeds[d.id] = feeds[d.id] ? feeds[d.id].slice(0, MAX_STORED_ROWS) : null;
    });
    const payload = JSON.stringify({ statuses, feeds: storedFeeds });
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

  const applyFeed = useCallback((agentId, rows, sourceLabel) => {
    const contract = FEED_CONTRACTS[agentId];
    const line = `Loaded ${rows.length} real ${contract.recordNoun} from ${sourceLabel}`;
    setFeeds((prev) => ({ ...prev, [agentId]: rows }));
    setAgents((prev) => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        logs: [
          { id: Date.now(), text: line, t: new Date() },
          ...prev[agentId].logs,
        ].slice(0, MAX_LOGS),
        metrics: contract.summarize(rows),
      },
    }));
    setTicker((prev) => [...prev, `${contract.id.toUpperCase()} · ${line}`].slice(-10));
  }, []);

  const clearFeed = useCallback((agentId) => {
    const contract = FEED_CONTRACTS[agentId];
    const line = `Real ${contract.recordNoun} cleared — back to simulated feed`;
    setFeeds((prev) => ({ ...prev, [agentId]: null }));
    setAgents((prev) => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        logs: [
          { id: Date.now(), text: line, t: new Date() },
          ...prev[agentId].logs,
        ].slice(0, MAX_LOGS),
        metrics: seedMetrics(agentId),
      },
    }));
    setTicker((prev) => [...prev, `${contract.id.toUpperCase()} · ${line}`].slice(-10));
  }, []);

  return { agents, ticker, feeds, toggleAgent, applyFeed, clearFeed };
}
