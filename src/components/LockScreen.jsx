import { useState } from "react";
import { Lock } from "lucide-react";
import { T, FONTS } from "../theme";
import { verifyPassword } from "../lib/dashboardAuth";

/** Password gate shown before the dashboard. Nothing behind it renders until unlock. */
export function LockScreen({ configured, onUnlock }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const ok = await verifyPassword(password);
      if (ok) {
        onUnlock();
      } else {
        setError("Wrong password. Try again.");
        setPassword("");
      }
    } catch {
      setError("This browser can't check the password (WebCrypto unavailable).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: T.ink,
        fontFamily: FONTS.sans,
        padding: 24,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 360,
          background: T.panel,
          border: `1px solid ${T.line}`,
          borderRadius: 12,
          padding: 32,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: T.panel2,
            border: `1px solid ${T.line}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Lock size={20} color={T.copper} />
        </div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 20,
            color: T.paper,
            marginBottom: 6,
          }}
        >
          InfinTrading
        </div>
        <div style={{ fontSize: 13, color: T.dim, marginBottom: 20 }}>
          This dashboard is private. Enter the password to continue.
        </div>

        {configured ? (
          <>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              autoComplete="current-password"
              disabled={busy}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: T.ink,
                border: `1px solid ${T.line}`,
                borderRadius: 8,
                color: T.paper,
                fontSize: 15,
                padding: "10px 12px",
                marginBottom: 12,
                fontFamily: FONTS.sans,
              }}
            />
            <button
              type="submit"
              disabled={busy || password.length === 0}
              style={{
                width: "100%",
                background: busy || password.length === 0 ? T.copperDim : T.copper,
                color: T.ink,
                border: "none",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                padding: "10px 12px",
                cursor: busy || password.length === 0 ? "default" : "pointer",
                fontFamily: FONTS.sans,
              }}
            >
              {busy ? "Checking…" : "Unlock"}
            </button>
            {error && (
              <div style={{ color: T.red, fontSize: 13, marginTop: 12 }}>{error}</div>
            )}
          </>
        ) : (
          <div
            style={{
              fontSize: 13,
              color: T.amber,
              background: T.panel2,
              border: `1px solid ${T.line}`,
              borderRadius: 8,
              padding: 12,
              textAlign: "left",
            }}
          >
            Access lock is not configured yet. Set the{" "}
            <span style={{ fontFamily: FONTS.mono }}>VITE_DASHBOARD_PASSWORD_SHA256</span>{" "}
            environment variable and redeploy — see README “Dashboard password”.
          </div>
        )}
      </form>
    </div>
  );
}
