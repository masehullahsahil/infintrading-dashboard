import React, { useState, useEffect, useRef, useCallback } from "react";
import Papa from "papaparse";
import {
  Search, Radar, Handshake, BookText, Play, Pause, Circle,
  LayoutGrid, Wallet, TrendingUp, Upload, CheckCircle2,
} from "lucide-react";

// ---------- design tokens ----------
const T = {
  ink: "#14171D",
  panel: "#1B1F27",
  panel2: "#20242D",
  line: "#2C313C",
  paper: "#EDE9DF",
  dim: "#8A8F9B",
  copper: "#C1794A",
  copperDim: "#8C5C39",
  green: "#6FBF73",
  red: "#D9584F",
  amber: "#D9A441",
};

// ---------------------------------------------------------------------------
// Mock data pools — used for Finder, Buyer, Bookkeeper (no real feed yet)
// and as Evaluator's placeholder until a real listings.csv is loaded.
// ---------------------------------------------------------------------------
const MODELS = [
  "ThinkPad X1 Carbon Gen9", "Dell XPS 13 9310", "ProBook 640 G5", "EliteBook 840 G8",
  "HP EliteBook 840 G8", "Lenovo Legion 5", "Surface Laptop 4", "Latitude 7420",
  "Dell Latitude 7420", "ThinkPad T14s Gen2",
];
const SCOUT_CHANNELS = ["Supplier price list", "Liquidation auction lot", "Wholesale portal", "Broker email"];
const CONDITIONS = ["A- (light wear)", "B+ (good, minor scuffs)", "B (used, functional)", "A (like new)"];
const SUPPLIER_TYPES = ["Liquidation auction house", "B2B wholesale marketplace", "Certified refurbisher", "Liquidation broker"];
const SUPPLIER_PREFIX = ["Summit", "Vector", "Crestline", "Northgate", "Anchor", "Meridian", "Union", "Harborview", "Redline", "Fenwick"];
const SUPPLIER_SUFFIX = ["Liquidators", "Wholesale Group", "Trading Co.", "Surplus Assets", "Electronics Exchange", "Bulk Supply"];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (a, b) => Math.floor(a + Math.random() * (b - a));

function finderEvent() {
  const name = `${rand(SUPPLIER_PREFIX)} ${rand(SUPPLIER_SUFFIX)}`;
  const type = rand(SUPPLIER_TYPES);
  return { text: `New supplier found: ${name} — ${type}`, name, type };
}
function evaluatorMockEvent() {
  const model = rand(MODELS);
  const price = randInt(180, 620);
  const src = rand(SCOUT_CHANNELS);
  const resale = price + randInt(40, 200);
  const margin = resale - price;
  return { text: `${model} — $${price} from ${src} — est. resale $${resale} · margin $${margin}`, model, price };
}
function buyerEvent(seed) {
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
function bookkeeperEvent(seed) {
  const model = seed?.model || rand(MODELS);
  const price = seed?.offer || randInt(150, 500);
  const roi = randInt(18, 55);
  return { text: `Purchase logged — ${model} · $${price} · projected ROI ${roi}%`, price, roi };
}

const AGENT_DEFS = [
  { id: "finder", name: "Finder", role: "Finds new supplier companies", icon: Search, gen: finderEvent,
    metricLabels: ["Suppliers found", "Roster size", "Under review"] },
  { id: "evaluator", name: "Evaluator", role: "Watches sources, prices what it finds", icon: Radar, gen: evaluatorMockEvent,
    metricLabels: ["Listings seen", "Matched to comp", "Avg. margin"] },
  { id: "buyer", name: "Buyer", role: "Offers & closes deals", icon: Handshake, gen: buyerEvent,
    metricLabels: ["Offers sent", "Active threads", "Accept rate"] },
  { id: "bookkeeper", name: "Bookkeeper", role: "Tracks spend & ROI", icon: BookText, gen: bookkeeperEvent,
    metricLabels: ["Units purchased", "Budget remaining", "Blended ROI"] },
];

function seedMetrics(id) {
  if (id === "finder") return [11, 11, 3];
  if (id === "evaluator") return [0, 0, "$0"];
  if (id === "buyer") return [22, 6, "41%"];
  return [8, "$1,240", "34%"];
}

function seedAgent(def) {
  return { status: "running", logs: [], metrics: seedMetrics(def.id) };
}

export default function AgentDashboard() {
  const [active, setActive] = useState("overview");
  const [agents, setAgents] = useState(() => {
    const o = {};
    AGENT_DEFS.forEach((d) => (o[d.id] = seedAgent(d)));
    return o;
  });
  const [ticker, setTicker] = useState(["System online — 4 agents initialized"]);
  const [realListings, setRealListings] = useState(null); // set once a CSV is uploaded
  const lastSeedRef = useRef({});
  const fileInputRef = useRef(null);

  const SEED_SOURCE = { buyer: "evaluator", bookkeeper: "buyer" };

  const tick = useCallback(() => {
    setAgents((prev) => {
      // Evaluator stops generating mock events once real data is loaded.
      const eligible = AGENT_DEFS.filter((d) => {
        if (prev[d.id].status !== "running") return false;
        if (d.id === "evaluator" && realListings) return false;
        return true;
      });
      if (eligible.length === 0) return prev;
      const def = rand(eligible);
      const seed = SEED_SOURCE[def.id] ? lastSeedRef.current[SEED_SOURCE[def.id]] : undefined;
      const ev = def.gen(seed);
      lastSeedRef.current[def.id] = ev;

      const next = { ...prev };
      const agent = { ...next[def.id] };
      agent.logs = [{ id: Date.now() + Math.random(), text: ev.text, t: new Date() }, ...agent.logs].slice(0, 40);

      const m = [...agent.metrics];
      if (def.id === "finder") { m[0] += 1; m[1] += 1; if (Math.random() > 0.5) m[2] += 1; }
      if (def.id === "evaluator") { m[0] += 1; if (Math.random() > 0.6) m[1] += 1; }
      if (def.id === "buyer" && ev.text.startsWith("Offer sent")) m[0] += 1;
      if (def.id === "bookkeeper" && ev.text.startsWith("Purchase")) m[0] += 1;
      agent.metrics = m;
      next[def.id] = agent;
      return next;
    });
  }, [realListings]);

  useEffect(() => {
    const interval = setInterval(tick, 2600);
    return () => clearInterval(interval);
  }, [tick]);

  const prevTopLogs = useRef({});
  useEffect(() => {
    const newest = [];
    AGENT_DEFS.forEach((d) => {
      const top = agents[d.id].logs[0];
      if (top && prevTopLogs.current[d.id] !== top.id) {
        prevTopLogs.current[d.id] = top.id;
        newest.push(`${d.name.toUpperCase()} · ${top.text}`);
      }
    });
    if (newest.length) setTicker((prev) => [...prev, ...newest].slice(-10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents]);

  const toggleAgent = (id) => {
    setAgents((prev) => ({
      ...prev,
      [id]: { ...prev[id], status: prev[id].status === "running" ? "paused" : "running" },
    }));
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        setRealListings(rows);
        const matched = rows.filter((r) => r.has_comp === true || r.has_comp === "True" || r.has_comp === "TRUE").length;
        const margins = rows
          .map((r) => Number(r.expected_profit))
          .filter((v) => !isNaN(v));
        const avgMargin = margins.length
          ? "$" + Math.round(margins.reduce((a, b) => a + b, 0) / margins.length)
          : "$0";
        setAgents((prev) => ({
          ...prev,
          evaluator: {
            ...prev.evaluator,
            logs: [{ id: Date.now(), text: `Loaded ${rows.length} real listings from ${file.name}`, t: new Date() }, ...prev.evaluator.logs],
            metrics: [rows.length, matched, avgMargin],
          },
        }));
        setTicker((prev) => [...prev, `EVALUATOR · Loaded ${rows.length} real listings from ${file.name}`].slice(-10));
      },
    });
    e.target.value = "";
  };

  const totalScanned = agents.evaluator.metrics[0];
  const unitsPurchased = agents.bookkeeper.metrics[0];
  const budgetRemaining = agents.bookkeeper.metrics[1];
  const roi = agents.bookkeeper.metrics[2];

  return (
    <div style={{ minHeight: "100%", background: T.ink, color: T.paper, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap');
        .mad-scroll::-webkit-scrollbar { width: 6px; }
        .mad-scroll::-webkit-scrollbar-thumb { background: ${T.line}; border-radius: 3px; }
        @keyframes mad-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .mad-nav-btn { transition: background 0.15s ease, border-color 0.15s ease; }
        .mad-nav-btn:hover { background: ${T.panel2}; }
        .mad-log-row { animation: mad-fade 0.25s ease; }
        @keyframes mad-fade { from { opacity: 0; transform: translateY(-4px);} to { opacity: 1; transform: translateY(0);} }
        .mad-btn { transition: opacity 0.15s ease; }
        .mad-btn:hover { opacity: 0.85; }
        table.mad-table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; }
        table.mad-table th { text-align: left; padding: 8px 10px; color: ${T.dim}; border-bottom: 1px solid ${T.line}; font-weight: 500; white-space: nowrap; }
        table.mad-table td { padding: 7px 10px; border-bottom: 1px solid ${T.line}; white-space: nowrap; }
      `}</style>

      <div style={{ borderBottom: `1px solid ${T.line}`, background: T.panel, overflow: "hidden", height: 34, display: "flex", alignItems: "center" }}>
        <div style={{ whiteSpace: "nowrap", display: "inline-flex", animation: "mad-marquee 22s linear infinite" }}>
          {[...ticker, ...ticker].map((t, i) => (
            <span key={i} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: T.dim, padding: "0 28px", borderRight: `1px solid ${T.line}` }}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100% - 34px)" }}>
        <div style={{ width: 232, minWidth: 232, borderRight: `1px solid ${T.line}`, background: T.panel, padding: "18px 12px" }}>
          <div style={{ padding: "0 8px 16px 8px" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: 0.2 }}>Trade Floor</div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>InfinTrading ops · 4 agents live</div>
          </div>

          <NavButton active={active === "overview"} onClick={() => setActive("overview")} icon={LayoutGrid} label="Overview" caption="All agents" dotColor={T.copper} />
          <div style={{ height: 1, background: T.line, margin: "10px 8px" }} />

          {AGENT_DEFS.map((d) => (
            <NavButton
              key={d.id}
              active={active === d.id}
              onClick={() => setActive(d.id)}
              icon={d.icon}
              label={d.name}
              caption={d.role}
              dotColor={agents[d.id].status === "running" ? T.green : T.dim}
            />
          ))}
        </div>

        <div style={{ flex: 1, padding: 28, overflow: "auto" }}>
          {active === "overview" ? (
            <Overview agents={agents} totalScanned={totalScanned} unitsPurchased={unitsPurchased} budgetRemaining={budgetRemaining} roi={roi} onOpen={setActive} realListings={realListings} />
          ) : active === "evaluator" ? (
            <EvaluatorPage
              def={AGENT_DEFS.find((d) => d.id === "evaluator")}
              agent={agents.evaluator}
              onToggle={() => toggleAgent("evaluator")}
              realListings={realListings}
              onUploadClick={() => fileInputRef.current?.click()}
            />
          ) : (
            <AgentPage def={AGENT_DEFS.find((d) => d.id === active)} agent={agents[active]} onToggle={() => toggleAgent(active)} />
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: "none" }} />
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label, caption, dotColor }) {
  return (
    <button onClick={onClick} className="mad-nav-btn" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", borderRadius: 8, border: `1px solid ${active ? T.copperDim : "transparent"}`, background: active ? T.panel2 : "transparent", cursor: "pointer", textAlign: "left", marginBottom: 4 }}>
      <Icon size={16} color={active ? T.copper : T.dim} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: active ? T.paper : T.dim }}>{label}</div>
        <div style={{ fontSize: 10.5, color: T.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{caption}</div>
      </div>
      <Circle size={7} fill={dotColor} color={dotColor} />
    </button>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 140 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {Icon && <Icon size={13} color={T.dim} />}
        <div style={{ fontSize: 11, color: T.dim, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, color: T.paper }}>{value}</div>
    </div>
  );
}

function Overview({ agents, totalScanned, unitsPurchased, budgetRemaining, roi, onOpen, realListings }) {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600 }}>Overview</div>
        <div style={{ fontSize: 13, color: T.dim, marginTop: 3 }}>Every agent's state, live — nothing running that you can't see here.</div>
      </div>

      {!realListings && (
        <div style={{ background: T.panel2, border: `1px solid ${T.copperDim}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 12.5, color: T.dim }}>
          Evaluator is showing simulated data. Open the Evaluator page and upload a real <code>listings.csv</code> (from <code>scout_parser.py</code>) to see real numbers.
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Listings seen" value={totalScanned} icon={Radar} />
        <StatCard label="Units purchased" value={unitsPurchased} icon={Wallet} />
        <StatCard label="Budget remaining" value={budgetRemaining} icon={Wallet} />
        <StatCard label="Blended ROI" value={roi} icon={TrendingUp} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {AGENT_DEFS.map((d) => {
          const a = agents[d.id];
          const Icon = d.icon;
          return (
            <button key={d.id} onClick={() => onOpen(d.id)} className="mad-btn" style={{ textAlign: "left", cursor: "pointer", background: T.panel, border: `1px solid ${T.line}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon size={16} color={T.copper} />
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div style={{ fontSize: 11.5, color: T.dim, marginBottom: 10 }}>{d.role}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: T.dim, borderTop: `1px solid ${T.line}`, paddingTop: 10, minHeight: 32 }}>
                {a.logs[0] ? a.logs[0].text : "Awaiting first event…"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const running = status === "running";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 600, color: running ? T.green : T.dim, letterSpacing: 0.3, textTransform: "uppercase" }}>
      <Circle size={7} fill={running ? T.green : T.dim} color={running ? T.green : T.dim} />
      {running ? "Running" : "Paused"}
    </div>
  );
}

function EvaluatorPage({ def, agent, onToggle, realListings, onUploadClick }) {
  const Icon = def.icon;
  const running = agent.status === "running";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: T.panel2, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${T.line}` }}>
            <Icon size={18} color={T.copper} />
          </div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600 }}>{def.name}</div>
            <div style={{ fontSize: 12, color: T.dim }}>{def.role}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onUploadClick} className="mad-btn" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", background: T.copper, color: T.ink, border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600 }}>
            <Upload size={13} /> Upload listings.csv
          </button>
          <StatusBadge status={agent.status} />
          <button onClick={onToggle} className="mad-btn" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", background: running ? "transparent" : T.copper, color: running ? T.paper : T.ink, border: `1px solid ${running ? T.line : T.copper}`, borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600 }}>
            {running ? <Pause size={13} /> : <Play size={13} />}
            {running ? "Pause agent" : "Resume agent"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {def.metricLabels.map((label, i) => (
          <StatCard key={label} label={label} value={agent.metrics[i]} />
        ))}
      </div>

      {realListings ? (
        <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.line}`, fontSize: 11.5, color: T.dim, textTransform: "uppercase", letterSpacing: 0.4, display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={13} color={T.green} /> Real listings — {realListings.length} rows
          </div>
          <div className="mad-scroll" style={{ maxHeight: 460, overflowX: "auto", overflowY: "auto" }}>
            <table className="mad-table">
              <thead>
                <tr>
                  <th>Brand</th><th>Model</th><th>CPU</th><th>Gen</th><th>Asking</th><th>Est. Resale</th><th>Margin</th><th>Comp?</th>
                </tr>
              </thead>
              <tbody>
                {realListings.slice(0, 200).map((r, i) => (
                  <tr key={i}>
                    <td>{r.brand}</td>
                    <td>{r.raw_model}</td>
                    <td>{r.cpu_family}</td>
                    <td>{r.gen}</td>
                    <td>${r.asking_price}</td>
                    <td>{r.estimated_resale ? "$" + r.estimated_resale : "—"}</td>
                    <td style={{ color: r.expected_profit > 0 ? T.green : T.dim }}>{r.expected_profit ? "$" + r.expected_profit : "—"}</td>
                    <td>{r.has_comp === true || r.has_comp === "True" ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.line}`, fontSize: 11.5, color: T.dim, textTransform: "uppercase", letterSpacing: 0.4 }}>Simulated activity — upload real data above to replace this</div>
          <div className="mad-scroll" style={{ maxHeight: 440, overflowY: "auto" }}>
            {agent.logs.length === 0 ? (
              <div style={{ padding: 24, fontSize: 12.5, color: T.dim, fontFamily: "'IBM Plex Mono', monospace" }}>Waiting on first event…</div>
            ) : (
              agent.logs.map((l) => (
                <div key={l.id} className="mad-log-row" style={{ display: "flex", gap: 12, padding: "9px 16px", borderBottom: `1px solid ${T.line}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 }}>
                  <span style={{ color: T.dim, minWidth: 62 }}>{l.t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                  <span style={{ color: T.paper }}>{l.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentPage({ def, agent, onToggle }) {
  const Icon = def.icon;
  const running = agent.status === "running";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: T.panel2, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${T.line}` }}>
            <Icon size={18} color={T.copper} />
          </div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600 }}>{def.name}</div>
            <div style={{ fontSize: 12, color: T.dim }}>{def.role}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <StatusBadge status={agent.status} />
          <button onClick={onToggle} className="mad-btn" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", background: running ? "transparent" : T.copper, color: running ? T.paper : T.ink, border: `1px solid ${running ? T.line : T.copper}`, borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600 }}>
            {running ? <Pause size={13} /> : <Play size={13} />}
            {running ? "Pause agent" : "Resume agent"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {def.metricLabels.map((label, i) => (
          <StatCard key={label} label={label} value={agent.metrics[i]} />
        ))}
      </div>

      <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.line}`, fontSize: 11.5, color: T.dim, textTransform: "uppercase", letterSpacing: 0.4 }}>Activity — newest first</div>
        <div className="mad-scroll" style={{ maxHeight: 440, overflowY: "auto" }}>
          {agent.logs.length === 0 ? (
            <div style={{ padding: 24, fontSize: 12.5, color: T.dim, fontFamily: "'IBM Plex Mono', monospace" }}>{running ? "Waiting on first event…" : "Agent is paused — no new activity."}</div>
          ) : (
            agent.logs.map((l) => (
              <div key={l.id} className="mad-log-row" style={{ display: "flex", gap: 12, padding: "9px 16px", borderBottom: `1px solid ${T.line}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 }}>
                <span style={{ color: T.dim, minWidth: 62 }}>{l.t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                <span style={{ color: T.paper }}>{l.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
