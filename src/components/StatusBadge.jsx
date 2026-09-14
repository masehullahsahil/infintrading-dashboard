import { Circle } from "lucide-react";
import { T } from "../theme";

export function StatusBadge({ status }) {
  const running = status === "running";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 10.5,
        fontWeight: 600,
        color: running ? T.green : T.dim,
        letterSpacing: 0.3,
        textTransform: "uppercase",
      }}
    >
      <Circle size={7} fill={running ? T.green : T.dim} color={running ? T.green : T.dim} />
      {running ? "Running" : "Paused"}
    </div>
  );
}
