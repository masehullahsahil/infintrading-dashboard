import { Pause, Play } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { DemoBadge } from "./DemoBadge";

/** Shared page header: agent icon + name + role, data-mode badge, pause/resume. */
export function PageHeader({ def, status, dataMode, onToggle, actions }) {
  const Icon = def.icon;
  const running = status === "running";
  return (
    <div className="mad-pagehead">
      <div className="mad-pagehead-id">
        <div className="mad-pagehead-icon">
          <Icon size={18} />
        </div>
        <div>
          <div className="mad-pagehead-name">
            {def.name}
            <DemoBadge mode={dataMode} />
          </div>
          <div className="mad-pagehead-role">{def.role}</div>
        </div>
      </div>
      <div className="mad-pagehead-actions">
        {actions}
        <StatusBadge status={status} />
        <button
          onClick={onToggle}
          className={running ? "mad-btn mad-btn-ghost" : "mad-btn mad-btn-primary"}
        >
          {running ? <Pause size={13} /> : <Play size={13} />}
          {running ? "Pause agent" : "Resume agent"}
        </button>
      </div>
    </div>
  );
}
