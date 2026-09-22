// Upload/clear controls plus validation feedback for one agent's real-data
// feed. Owns the whole upload flow: file -> contract validation -> rows up
// to the parent, or an operator-facing error with nothing applied.

import { useRef, useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { parseFeedFile } from "../lib/agentFeeds";

function Notice({ tone, children }) {
  return (
    <div
      role={tone === "error" ? "alert" : "note"}
      className={tone === "error" ? "mad-notice mad-notice-error" : "mad-notice"}
    >
      {children}
    </div>
  );
}

export function FeedControls({ contract, hasFeed, onFeedLoaded, onClearFeed }) {
  const fileInputRef = useRef(null);
  const [feedError, setFeedError] = useState(null);
  const [feedWarnings, setFeedWarnings] = useState([]);
  const [parsing, setParsing] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setParsing(true);
    setFeedError(null);
    setFeedWarnings([]);
    const { rows, warnings, error } = await parseFeedFile(file, contract.id);
    setParsing(false);
    if (error) {
      setFeedError(error);
      return;
    }
    setFeedWarnings(warnings);
    onFeedLoaded(rows, file.name);
  };

  const handleClear = () => {
    setFeedWarnings([]);
    setFeedError(null);
    onClearFeed();
  };

  const showNotices = feedError || feedWarnings.length > 0;

  return (
    <div className="mad-feedbar">
      <div className={showNotices ? "mad-feedbar-row mad-feedbar-row-spaced" : "mad-feedbar-row"}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={parsing}
          className="mad-btn mad-btn-primary"
          title={`CSV or JSON — see README for the ${contract.id} feed contract`}
        >
          <Upload size={13} /> {parsing ? "Parsing…" : `Upload ${contract.fileLabel}`}
        </button>
        {hasFeed && (
          <button onClick={handleClear} className="mad-btn mad-btn-dim">
            <Trash2 size={13} /> Clear data
          </button>
        )}
        <span className="mad-feedbar-hint">
          CSV or JSON · validated before anything is applied
        </span>
      </div>

      {feedError && <Notice tone="error">{feedError}</Notice>}
      {feedWarnings.map((w, i) => (
        <Notice key={i} tone="warning">
          {w}
        </Notice>
      ))}

      <input
        ref={fileInputRef}
        type="file"
        accept={contract.accept}
        onChange={handleFile}
        className="mad-hidden-input"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
