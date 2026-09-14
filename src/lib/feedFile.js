// Shared file-reading for real-data feed uploads (all agents).
// UI-free so it can be unit-tested; parsing and validation live in
// agentFeeds.js. Never throws — problems come back as `error`.

export const MAX_FEED_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Read an uploaded feed file as text.
 * @returns {Promise<{ text: string | null, error: string | null }>}
 */
export function readFeedFile(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve({ text: null, error: "No file selected." });
      return;
    }
    if (file.size > MAX_FEED_BYTES) {
      resolve({
        text: null,
        error: `“${file.name}” is ${(file.size / 1048576).toFixed(1)} MB — the limit is 5 MB.`,
      });
      return;
    }
    const reader = new FileReader();
    reader.onerror = () =>
      resolve({ text: null, error: `Could not read “${file.name}”.` });
    reader.onload = () =>
      resolve({ text: String(reader.result ?? ""), error: null });
    reader.readAsText(file);
  });
}
