import { Pause, Play } from "lucide-react";
import { T, FONTS } from "../theme";
import { StatusBadge } from "./StatusBadge";
import { DemoBadge } from "./DemoBadge";

/** Shared page header: agent icon + name + role, data-mode badge, pause/resume. */
export function PageHeader({ def, status, dataMode, onToggle, actions }) {
  const Icon = def.icon;
  const running = status === "running";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 9,
            background: T.panel2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${T.line}`,
            flexShrink: 0,
          }}
        >
          <Icon size={18} color={T.copper} />
        </div>
        <div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 20,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {def.name}
            <DemoBadge mode={dataMode} />
          </div>
          <div style={{ fontSize: 12, color: T.dim }}>{def.role}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {actions}
        <StatusBadge status={status} />
        <button
          onClick={onToggle}
          className="mad-btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            background: running ? "transparent" : T.copper,
            color: running ? T.paper : T.ink,
            border: `1px solid ${running ? T.line : T.copper}`,
            borderRadius: 8,
            padding: "7px 14px",
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          {running ? <Pause size={13} /> : <Play size={13} />}
          {running ? "Pause agent" : "Resume agent"}
        </button>
      </div>
    </div>
  );
}
