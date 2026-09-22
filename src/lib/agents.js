// Agent definitions: the four trading agents the dashboard tracks.
// `gen` is the demo-feed event generator for each agent (see mockGenerators.js).
// Agents without a `gen` (like the Deal Tracker) are user-state agents: they
// never emit simulated events.

import { Search, Radar, Handshake, Target } from "lucide-react";
import { finderEvent, evaluatorMockEvent, buyerEvent } from "./mockGenerators";

export const AGENT_DEFS = [
  {
    id: "finder",
    name: "Finder",
    role: "Finds new supplier companies",
    icon: Search,
    gen: finderEvent,
    metricLabels: ["Suppliers found", "Roster size", "Under review"],
  },  {
    id: "evaluator",
    name: "Evaluator",
    role: "Watches sources, prices what it finds",
    icon: Radar,
    gen: evaluatorMockEvent,
    metricLabels: ["Listings seen", "Matched to comp", "Avg. margin"],
  },  {
    id: "deals",
    name: "Deal Tracker",
    role: "Tracks the lots you're pursuing",
    icon: Target,
    gen: null,
    metricLabels: ["Tracked", "Closing soon", "Won"],
  },  {
    id: "buyer",
    name: "Buyer",
    role: "Offers & closes deals",
    icon: Handshake,
    gen: buyerEvent,
    metricLabels: ["Offers sent", "Active threads", "Accept rate"],
  },];

// Which agent's last event seeds another agent's generator (demo feed only).
export const SEED_SOURCE = { buyer: "evaluator" };

// Starting metric values. These are demo placeholders, not real measurements —
// the UI labels every agent running on them with a "Simulated feed" badge.
export function seedMetrics(id) {
  if (id === "finder") return [11, 11, 3];
  if (id === "evaluator") return [0, 0, "$0"];
  if (id === "buyer") return [22, 6, "41%"];
  return [0, 0, 0];
}

export function seedAgent(def) {
  return { status: "running", logs: [], metrics: seedMetrics(def.id) };
}
