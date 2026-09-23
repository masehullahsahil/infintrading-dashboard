import { Circle, LayoutGrid, Lock } from "lucide-react";
import { T } from "../theme";
import { AGENT_DEFS } from "../lib/agents";

export function NavButton({ active, onClick, icon: Icon, label, caption, dotColor, compact }) {
  const classes = ["mad-nav-btn"];
  if (active) classes.push("mad-nav-btn-active");
  if (compact) classes.push("mad-nav-btn-compact");
  return (
    <button
      onClick={onClick}
      className={classes.join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={16} />
      <div className="mad-nav-btn-body">
        <div className="mad-nav-btn-label">{label}</div>
        {!compact && <div className="mad-nav-btn-caption">{caption}</div>}
      </div>
      <Circle size={7} fill={dotColor} color={dotColor} />
    </button>
  );
}

/** Left nav on desktop, horizontal scroll nav on narrow screens. */
export function Sidebar({ active, onSelect, agents, narrow, onLock }) {
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
      <nav aria-label="Dashboard sections" className="mad-scroll mad-nav-narrow">
        {buttons}
        {onLock && (
          <button
            onClick={onLock}
            className="mad-nav-btn mad-nav-btn-compact"
            title="Lock the dashboard"
            aria-label="Lock the dashboard"
          >
            <Lock size={16} />
          </button>
        )}
      </nav>
    );
  }

  return (
    <nav aria-label="Dashboard sections" className="mad-nav">
      <div className="mad-nav-brand">
        <div className="mad-nav-title">Trade Floor</div>
        <div className="mad-nav-sub">InfinTrading ops · 4 agents live</div>
      </div>

      {buttons}

      {onLock && (
        <button
          onClick={onLock}
          className="mad-nav-btn"
          title="Lock the dashboard"
          style={{ marginTop: 12 }}
        >
          <Lock size={16} />
          <div className="mad-nav-btn-body">
            <div className="mad-nav-btn-label">Lock</div>
            <div className="mad-nav-btn-caption">Require password</div>
          </div>
        </button>
      )}
    </nav>
  );
}
