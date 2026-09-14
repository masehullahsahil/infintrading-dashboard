import { T, FONTS } from "../theme";

export function StatCard({ label, value, icon: Icon }) {
  return (
    <div
      style={{
        background: T.panel,
        border: `1px solid ${T.line}`,
        borderRadius: 10,
        padding: "14px 16px",
        flex: 1,
        minWidth: 140,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {Icon && <Icon size={13} color={T.dim} />}
        <div
          style={{
            fontSize: 11,
            color: T.dim,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: 22,
          fontWeight: 600,
          color: T.paper,
        }}
      >
        {value}
      </div>
    </div>
  );
}
