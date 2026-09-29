import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { checkSession, isGateConfigured, isUnlocked, lock, login, logout, setUnlocked } from "./dashboardAuth";

describe("server-backed dashboard authentication", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("sessionStorage", {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("always treats the client gate as server-configured", () => {
    expect(isGateConfigured()).toBe(true);
  });

  it("checks the HttpOnly server session", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ configured: true, authenticated: true }) });
    await expect(checkSession()).resolves.toEqual({ configured: true, authenticated: true });
    expect(fetch).toHaveBeenCalledWith("/api/auth", { credentials: "same-origin" });
  });

  it("logs in through the server without sending a secret to the client bundle", async () => {
    fetch.mockResolvedValue({ ok: true });
    await expect(login("correct horse")).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith("/api/auth", expect.objectContaining({ method: "POST" }));
    expect(fetch.mock.calls[0][1].body).toContain('"action":"login"');
  });

  it("fails closed when the server is unavailable", async () => {
    fetch.mockRejectedValue(new Error("offline"));
    await expect(checkSession()).resolves.toEqual({ configured: false, authenticated: false });
    await expect(login("anything")).resolves.toBe(false);
  });

  it("keeps only a non-authoritative session marker locally", () => {
    expect(isUnlocked()).toBe(false);
    setUnlocked();
    lock();
    expect(sessionStorage.setItem).toHaveBeenCalled();
    expect(sessionStorage.removeItem).toHaveBeenCalled();
  });

  it("logs out through the server", async () => {
    fetch.mockResolvedValue({ ok: true });
    await logout();
    expect(fetch).toHaveBeenCalledWith("/api/auth", expect.objectContaining({ method: "POST" }));
  });
});
