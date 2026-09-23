import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sha256Hex,
  safeEqualHex,
  verifyPassword,
  isUnlocked,
  setUnlocked,
  lock,
  isGateConfigured,
  getConfiguredHash,
} from "./dashboardAuth";

describe("sha256Hex", () => {
  it("hashes a known value", async () => {
    // SHA-256("abc") — canonical test vector
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });
});

describe("safeEqualHex", () => {
  it("compares equal strings", () => {
    expect(safeEqualHex("abcd", "abcd")).toBe(true);
  });
  it("rejects different strings of the same length", () => {
    expect(safeEqualHex("abcd", "abce")).toBe(false);
  });
  it("rejects different lengths without leaking", () => {
    expect(safeEqualHex("abc", "abcd")).toBe(false);
  });
  it("rejects non-strings", () => {
    expect(safeEqualHex(null, "abcd")).toBe(false);
  });
});

describe("verifyPassword", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DASHBOARD_PASSWORD_SHA256", "");
  });

  it("fails closed when no hash is configured", async () => {
    expect(isGateConfigured()).toBe(false);
    expect(getConfiguredHash()).toBe("");
    expect(await verifyPassword("anything")).toBe(false);
  });

  it("accepts the right password and rejects the wrong one", async () => {
    const hash = await sha256Hex("correct horse");
    vi.stubEnv("VITE_DASHBOARD_PASSWORD_SHA256", hash);
    expect(isGateConfigured()).toBe(true);
    expect(await verifyPassword("correct horse")).toBe(true);
    expect(await verifyPassword("wrong horse")).toBe(false);
  });

  it("ignores a malformed configured hash", async () => {
    vi.stubEnv("VITE_DASHBOARD_PASSWORD_SHA256", "not-a-hash");
    expect(isGateConfigured()).toBe(false);
    expect(await verifyPassword("not-a-hash")).toBe(false);
  });
});

describe("session lock state", () => {
  beforeEach(() => {
    const store = new Map();
    vi.stubGlobal("sessionStorage", {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts locked, unlocks, and re-locks", () => {
    expect(isUnlocked()).toBe(false);
    setUnlocked();
    expect(isUnlocked()).toBe(true);
    lock();
    expect(isUnlocked()).toBe(false);
  });
});
