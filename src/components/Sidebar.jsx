import { Circle, LayoutGrid } from "lucide-react";
import { T, FONTS } from "../theme";
import { AGENT_DEFS } from "../lib/agents";

export function NavButton({ active, onClick, icon: Icon, label, caption, dotColor, compact }) {
  return (
    <button
      onClick={onClick}
      className="mad-nav-btn"
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: compact ? "8px 12px" : "9px 8px",
        borderRadius: 8,
        border: `1px solid ${active ? T.copperDim : "transparent"}`,
        background: active ? T.panel2 : "transparent",
        cursor: "pointer",
        textAlign: "left",
        marginBottom: compact ? 0 : 4,
        flex: compact ? "0 0 auto" : undefined,
        width: compact ? undefined : "100%",
        color: "inherit",
        font: "inherit",
      }}
    >
      <Icon size={16} color={active ? T.copper : T.dim} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: active ? T.paper : T.dim,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
        {!compact && (
          <div
            style={{
              fontSize: 10.5,
              color: T.dim,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {caption}
          </div>
        )}
      </div>
      <Circle size={7} fill={dotColor} color={dotColor} />
    </button>
  );
}

/** Left nav on desktop, horizontal scroll nav on narrow screens. */
export function Sidebar({ active, onSelect, agents, narrow }) {
  const buttons = (
    <>
      <NavButton
        active={active === "overview"}
        onClick={() => onSelect("overview")}
        icon={LayoutGrid}
        label="Overview"
        caption="All agents"
        dotColor={T.copper}
        compact={narrow}
      />
      {AGENT_DEFS.map((d) => (
        <NavButton
          key={d.id}
          active={active === d.id}
          onClick={() => onSelect(d.id)}
          icon={d.icon}
          label={d.name}
          caption={d.role}
          dotColor={agents[d.id].status === "running" ? T.green : T.dim}
          compact={narrow}
        />
      ))}
    </>
  );

  if (narrow) {
    return (
      <nav
        aria-label="Dashboard sections"
        className="mad-scroll"
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "10px 12px",
          borderBottom: `1px solid ${T.line}`,
          background: T.panel,
          flexShrink: 0,
        }}
      >
        {buttons}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Dashboard sections"
      style={{
        width: 232,
        minWidth: 232,
        borderRight: `1px solid ${T.line}`,
        background: T.panel,
        padding: "18px 12px",
        flexShrink: 0,
      }}
    >
      <div style={{ padding: "0 8px 16px 8px" }}>
        <div
          style={{
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: 0.2,
          }}
        >
          Trade Floor
        </div>
        <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
          InfinTrading ops · 4 agents live
        </div>
      </div>

      {buttons}
    </nav>
  );
}
