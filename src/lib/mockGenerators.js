// Simulated event generators — the "demo feed" behind the dashboard.
//
// These stand in for real agent backends until live data sources are wired up
// (see src/lib/dataSource.js). Every generator returns { text, ...fields }
// where `text` is the human-readable log line and the extra fields carry the
// structured values other agents seed from.

export const MODELS = [
  "ThinkPad X1 Carbon Gen9", "Dell XPS 13 9310", "ProBook 640 G5", "EliteBook 840 G8",
  "HP EliteBook 840 G8", "Lenovo Legion 5", "Surface Laptop 4", "Latitude 7420",
  "Dell Latitude 7420", "ThinkPad T14s Gen2",
];

export const SCOUT_CHANNELS = ["Supplier price list", "Liquidation auction lot", "Wholesale portal", "Broker email"];

export const SUPPLIER_TYPES = ["Liquidation auction house", "B2B wholesale marketplace", "Certified refurbisher", "Liquidation broker"];

export const SUPPLIER_PREFIX = ["Summit", "Vector", "Crestline", "Northgate", "Anchor", "Meridian", "Union", "Harborview", "Redline", "Fenwick"];

export const SUPPLIER_SUFFIX = ["Liquidators", "Wholesale Group", "Trading Co.", "Surplus Assets", "Electronics Exchange", "Bulk Supply"];

export const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const randInt = (a, b) => Math.floor(a + Math.random() * (b - a));

export function finderEvent() {
  const name = `${rand(SUPPLIER_PREFIX)} ${rand(SUPPLIER_SUFFIX)}`;
  const type = rand(SUPPLIER_TYPES);
  return { text: `New supplier found: ${name} — ${type}`, name, type };
}

export function evaluatorMockEvent() {
  const model = rand(MODELS);
  const price = randInt(180, 620);
  const src = rand(SCOUT_CHANNELS);
  const resale = price + randInt(40, 200);
  const margin = resale - price;
  return { text: `${model} — $${price} from ${src} — est. resale $${resale} · margin $${margin}`, model, price };
}

export function buyerEvent(seed) {
  const model = seed?.model || rand(MODELS);
  const ask = seed?.price || randInt(180, 620);
  const offer = Math.max(60, ask - randInt(10, 60));
  const outcomes = [
    `Offer sent on ${model}: $${offer} (asking $${ask})`,
    `Seller countered on ${model}: $${ask - randInt(0, 15)}`,
    `Deal accepted — ${model} at $${offer}`,
    `No response yet on ${model}, follow-up queued`,
  ];
  return { text: rand(outcomes), model, offer };
}
