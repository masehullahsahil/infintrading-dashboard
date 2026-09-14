import { describe, it, expect } from "vitest";
import { readFeedFile, MAX_FEED_BYTES } from "./feedFile";

describe("readFeedFile", () => {
  it("rejects oversized files without reading them", async () => {
    const file = { name: "huge.csv", size: MAX_FEED_BYTES + 1 };
    const { text, error } = await readFeedFile(file);
    expect(text).toBeNull();
    expect(error).toContain("limit is 5 MB");
  });

  it("handles a missing file", async () => {
    const { text, error } = await readFeedFile(null);
    expect(text).toBeNull();
    expect(error).toContain("No file selected");
  });
});
