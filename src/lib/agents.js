// Agent definitions: the four trading agents the dashboard tracks.
// `gen` is the demo-feed event generator for each agent (see mockGenerators.js).

import { Search, Radar, Handshake, BookText } from "lucide-react";
import { finderEvent, evaluatorMockEvent, buyerEvent, bookkeeperEvent } from "./mockGenerators";

export const AGENT_DEFS = [
  {
    id: "finder",
    name: "Finder",
    role: "Finds new supplier companies",
    icon: Search,
    gen: finderEvent,
    metricLabels: ["Suppliers found", "Roster size", "Under review"],
  },
  {
    id: "evaluator",
    name: "Evaluator",
    role: "Watches sources, prices what it finds",
    icon: Radar,
    gen: evaluatorMockEvent,
    metricLabels: ["Listings seen", "Matched to comp", "Avg. margin"],
  },
  {
    id: "buyer",
    name: "Buyer",
    role: "Offers & closes deals",
    icon: Handshake,
    gen: buyerEvent,
    metricLabels: ["Offers sent", "Active threads", "Accept rate"],
  },
  {
    id: "bookkeeper",
    name: "Bookkeeper",
    role: "Tracks spend & ROI",
    icon: BookText,
    gen: bookkeeperEvent,
    metricLabels: ["Units purchased", "Budget remaining", "Blended ROI"],
  },
];

// Which agent's last event seeds another agent's generator (demo feed only).
export const SEED_SOURCE = { buyer: "evaluator", bookkeeper: "buyer" };

// Starting metric values. These are demo placeholders, not real measurements —
// the UI labels every agent running on them with a "Simulated feed" badge.
export function seedMetrics(id) {
  if (id === "finder") return [11, 11, 3];
  if (id === "evaluator") return [0, 0, "$0"];
  if (id === "buyer") return [22, 6, "41%"];
  return [8, "$1,240", "34%"];
}

export function seedAgent(def) {
  return { status: "running", logs: [], metrics: seedMetrics(def.id) };
}
