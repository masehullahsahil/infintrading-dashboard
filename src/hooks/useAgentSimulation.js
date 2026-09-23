import { useCallback, useEffect, useRef, useState } from "react";
import { AGENT_DEFS, SEED_SOURCE, seedAgent, seedMetrics } from "../lib/agents";
import { rand } from "../lib/mockGenerators";
import { FEED_CONTRACTS } from "../lib/agentFeeds";
import { fetchLiveFeed, fetchLiveSuppliers, fetchLiveCandidates, liveIsNewer } from "../lib/liveFeed";
import {
  createDealFromListing,
  dealIdFromListing,
} from "../lib/deals";
import {
  EMPTY_CANDIDATE_DECISIONS,
  approveCandidate as approveCandidateDecision,
  dismissCandidate as dismissCandidateDecision,
} from "../lib/supplierCandidates";

const STORAGE_KEY = "mad:v2";
const LEGACY_STORAGE_KEY = "mad:v1";
const CANDIDATE_DECISIONS_KEY = "mad:candidate-decisions";
const MAX_STORED_ROWS = 200;
const TICK_MS = 2600;
const MAX_LOGS = 40;

// Where a live feed came from: "live" (automatic scan) or "upload" (manual
// file). A manual upload always wins — the live fetcher never overwrites it.
const EMPTY_SOURCES = {
  finder: null,
  evaluator: null,
  buyer: null,
  deals: null,
};

const EMPTY_FEEDS = {
  finder: null,
  evaluator: null,
  buyer: null,
  deals: null,
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

function loadSources() {
  const v2 = loadStored(STORAGE_KEY);
  if (v2 && v2.feedSources && typeof v2.feedSources === "object") {
    const sources = { ...EMPTY_SOURCES };
    for (const id of Object.keys(sources)) {
      const s = v2.feedSources[id];
      sources[id] =
        s && (s.source === "live" || s.source === "upload") ? s : null;
    }
    return sources;
  }
  return { ...EMPTY_SOURCES };
}

function loadStatuses() {
  return (
    loadStored(STORAGE_KEY)?.statuses ?? loadStored(LEGACY_STORAGE_KEY)?.statuses ?? null
  );
}

// Tracked deals are user state (not a feed): rehydrate the array, dropping
// anything that doesn't look like a deal.
function loadDeals() {
  const raw = loadStored(STORAGE_KEY)?.deals;
  if (!Array.isArray(raw)) return [];
  return raw.filter((d) => d && typeof d.id === "string" && typeof d.lot === "string");
}

// Supplier candidate decisions (approved / dismissed) are the operator's own
// state, like tracked deals: rehydrate the lists, dropping anything malformed.
function loadCandidateDecisions() {
  const raw = loadStored(CANDIDATE_DECISIONS_KEY);
  if (!raw || typeof raw !== "object") return EMPTY_CANDIDATE_DECISIONS;
  const clean = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
  return { approved: clean(raw.approved), dismissed: clean(raw.dismissed) };
}

function initialState() {
  const feeds = loadFeeds();
  const feedSources = loadSources();
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
  return { agents, feeds, feedSources };
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
  const [feedSources, setFeedSources] = useState(boot.feedSources);
  const [deals, setDeals] = useState(loadDeals);
  const [liveMeta, setLiveMeta] = useState(null);
  const [liveAvailable, setLiveAvailable] = useState(false);
  const [supplierLiveAvailable, setSupplierLiveAvailable] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [candidateDecisions, setCandidateDecisions] = useState(loadCandidateDecisions);
  const [ticker, setTicker] = useState(["System online — 4 agents initialized"]);
  const lastSeedRef = useRef({});
  const prevTopLogs = useRef({});
  const lastSavedRef = useRef("");
  const liveAttemptedRef = useRef(false);
  const supplierLiveAttemptedRef = useRef(false);

  // Demo feed: one random running agent emits an event every tick.
  // An agent stops emitting mock events once its real feed is loaded, so
  // simulated rows never mix into a live dataset. Agents without a demo
  // generator (user-state agents like the Deal Tracker) never emit.
  const tick = useCallback(() => {
    setAgents((prev) => {
      const eligible = AGENT_DEFS.filter((d) => {
        if (!d.gen) return false;
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

  // Persist pause state + real feeds + feed provenance + tracked deals;
  // rehydrated on next load.
  useEffect(() => {
    const statuses = {};
    const storedFeeds = {};
    AGENT_DEFS.forEach((d) => {
      statuses[d.id] = agents[d.id].status;
      storedFeeds[d.id] = feeds[d.id] ? feeds[d.id].slice(0, MAX_STORED_ROWS) : null;
    });
    const payload = JSON.stringify({ statuses, feeds: storedFeeds, feedSources, deals });
    // Candidate decisions live under their own storage key, so fold them into
    // the persistence guard: approving/dismissing a candidate changes nothing
    // in `payload`, and without this the write below is skipped and the
    // decision is lost on reload.
    const decisionsPayload = JSON.stringify(candidateDecisions);
    const combined = payload + "\n" + decisionsPayload;
    if (combined === lastSavedRef.current) return;
    lastSavedRef.current = combined;
    try {
      window.localStorage.setItem(STORAGE_KEY, payload);
      window.localStorage.setItem(CANDIDATE_DECISIONS_KEY, decisionsPayload);
    } catch {
      // Storage full or unavailable — dashboard works fine without it.
    }
  });

  // Deal Tracker metrics are derived from the deals list where they're
  // displayed (Overview, DealTrackerPage) — no sync effect needed.

  // Flag an Evaluator lot as a tracked deal. Re-tracking the same lot is a
  // no-op (stable id), so the Track button can't create duplicates.
  const trackDeal = useCallback((listingRow) => {
    const id = dealIdFromListing(listingRow);
    let added = false;
    setDeals((prev) => {
      if (prev.some((d) => d.id === id)) return prev;
      added = true;
      return [...prev, createDealFromListing(listingRow)];
    });
    // Note: `added` is only accurate on the first call per render; the
    // ticker line is best-effort and harmless if duplicated.
    setTicker((prev) =>
      [...prev, `DEAL TRACKER · Now tracking ${listingRow.raw_model || "lot"}`].slice(-10)
    );
    return added;
  }, []);

  const updateDeal = useCallback((id, patch) => {
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }, []);

  const removeDeal = useCallback((id) => {
    setDeals((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const toggleAgent = useCallback((id) => {
    setAgents((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        status: prev[id].status === "running" ? "paused" : "running",
      },
    }));
  }, []);

  const applyFeed = useCallback((agentId, rows, sourceLabel, source = "upload") => {
    const contract = FEED_CONTRACTS[agentId];
    const line = `Loaded ${rows.length} real ${contract.recordNoun} from ${sourceLabel}`;
    setFeeds((prev) => ({ ...prev, [agentId]: rows }));
    setFeedSources((prev) => ({
      ...prev,
      [agentId]: { source, at: new Date().toISOString() },
    }));
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
    setFeedSources((prev) => ({ ...prev, [agentId]: null }));
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

  // Live feed: once per page load, pull the Evaluator's automatic scan feed.
  // Applies when there is no feed yet, or when the current feed also came
  // from the live pipe and the scan is newer. A manual upload always wins.
  useEffect(() => {
    if (liveAttemptedRef.current) return;
    liveAttemptedRef.current = true;
    let cancelled = false;
    fetchLiveFeed().then((live) => {
      if (cancelled || !live) return;
      setLiveMeta(live.meta);
      setLiveAvailable(true);
      const current = feedSources.evaluator;
      const shouldApply =
        !feeds.evaluator ||
        (current && current.source === "live" && liveIsNewer(live.meta, current));
      if (shouldApply) {
        const when =
          live.meta && live.meta.scan_at ? `live scan ${live.meta.scan_at}` : "live scan";
        applyFeed("evaluator", live.rows, when, "live");
      }
    });
    return () => {
      cancelled = true;
    };
    // Once on mount; feeds/feedSources come from boot state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Explicit operator action: switch the Evaluator back to the live feed.
  const useLiveFeed = useCallback(async () => {
    const live = await fetchLiveFeed();
    if (!live) return false;
    setLiveMeta(live.meta);
    setLiveAvailable(true);
    const when =
      live.meta && live.meta.scan_at ? `live scan ${live.meta.scan_at}` : "live scan";
    applyFeed("evaluator", live.rows, when, "live");
    return true;
  }, [applyFeed]);

  // Supplier live feed: once per page load, pull the Finder's automatic roster.
  // Same rules as the Evaluator: applies when there is no roster yet, or when
  // the current roster also came from the live pipe. A manual upload wins.
  useEffect(() => {
    if (supplierLiveAttemptedRef.current) return;
    supplierLiveAttemptedRef.current = true;
    let cancelled = false;
    fetchLiveSuppliers().then((live) => {
      if (cancelled || !live) return;
      setSupplierLiveAvailable(true);
      const current = feedSources.finder;
      const shouldApply = !feeds.finder || (current && current.source === "live");
      if (shouldApply) {
        applyFeed("finder", live.rows, "live supplier roster", "live");
      }
    });
    fetchLiveCandidates().then((rows) => {
      if (cancelled || !rows) return;
      setCandidates(rows);
    });
    return () => {
      cancelled = true;
    };
    // Once on mount; feeds/feedSources come from boot state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Explicit operator action: switch the Finder back to the live roster.
  const useLiveSuppliers = useCallback(async () => {
    const live = await fetchLiveSuppliers();
    if (!live) return false;
    setSupplierLiveAvailable(true);
    applyFeed("finder", live.rows, "live supplier roster", "live");
    return true;
  }, [applyFeed]);

  // Candidate review queue decisions.
  const approveSupplierCandidate = useCallback((candidate) => {
    setCandidateDecisions((prev) => approveCandidateDecision(prev, candidate));
    setTicker((prev) =>
      [...prev, `FINDER · Approved candidate ${candidate.company || "supplier"} — merged into roster as under review`].slice(-10)
    );
  }, []);

  const dismissSupplierCandidate = useCallback((candidate) => {
    setCandidateDecisions((prev) => dismissCandidateDecision(prev, candidate));
  }, []);

  return {
    agents,
    ticker,
    feeds,
    feedSources,
    deals,
    liveMeta,
    liveAvailable,
    supplierLiveAvailable,
    candidates,
    candidateDecisions,
    toggleAgent,
    applyFeed,
    clearFeed,
    useLiveFeed,
    useLiveSuppliers,
    approveSupplierCandidate,
    dismissSupplierCandidate,
    trackDeal,
    updateDeal,
    removeDeal,
  };
}
