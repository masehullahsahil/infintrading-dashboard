import { Component } from "react";
import { T, FONTS } from "../theme";

/** Catches render crashes anywhere below it so one bad component can't take down the whole floor. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Hook for a real error reporter (Sentry, etc.) later.
    console.error("Dashboard crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: T.ink,
            color: T.paper,
            fontFamily: FONTS.sans,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: T.panel,
              border: `1px solid ${T.line}`,
              borderRadius: 12,
              padding: 32,
              maxWidth: 440,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 20,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Something broke on the trade floor
            </div>
            <div style={{ fontSize: 13, color: T.dim, marginBottom: 20 }}>
              The dashboard hit an unexpected error. Reloading usually fixes
              it — your uploaded listings and agent pause states are saved.
            </div>
            <button
              className="mad-btn"
              onClick={() => window.location.reload()}
              style={{
                cursor: "pointer",
                background: T.copper,
                color: T.ink,
                border: "none",
                borderRadius: 8,
                padding: "9px 20px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Reload dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
