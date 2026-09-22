import { Component } from "react";

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
        <div className="mad-crash">
          <div className="mad-crash-card">
            <div className="mad-crash-title">Something broke on the trade floor</div>
            <div className="mad-crash-body">
              The dashboard hit an unexpected error. Reloading usually fixes
              it — your uploaded listings and agent pause states are saved.
            </div>
            <button
              className="mad-btn mad-btn-primary mad-btn-lg"
              onClick={() => window.location.reload()}
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
