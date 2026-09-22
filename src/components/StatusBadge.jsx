import { Circle } from "lucide-react";

export function StatusBadge({ status }) {
  const running = status === "running";
  return (
    <div className={running ? "mad-badge mad-status mad-status-running" : "mad-badge mad-status"}>
      <Circle size={7} fill="currentColor" />
      {running ? "Running" : "Paused"}
    </div>
  );
}
