// Dashboard access gate. The password itself is never stored in the repo:
// at build time, Vercel embeds VITE_DASHBOARD_PASSWORD_SHA256 (the hex
// SHA-256 of the chosen password) into the bundle, and the typed password
// is hashed in the browser and compared. Unlock lasts for the tab session.

const SESSION_KEY = "infintrading-dashboard-unlocked";
const ENV_KEY = "VITE_DASHBOARD_PASSWORD_SHA256";

export function getConfiguredHash() {
  const raw = (import.meta.env?.[ENV_KEY] || "").trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(raw) ? raw : "";
}

export function isGateConfigured() {
  return getConfiguredHash().length === 64;
}

function subtleCrypto() {
  if (typeof crypto !== "undefined" && crypto.subtle?.digest) return crypto.subtle;
  return null;
}

export async function sha256Hex(text) {
  const subtle = subtleCrypto();
  if (!subtle) throw new Error("WebCrypto SHA-256 is unavailable in this browser");
  const bytes = await subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time hex comparison so a wrong guess leaks nothing about the hash. */
export function safeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password) {
  const expected = getConfiguredHash();
  if (!expected) return false;
  const actual = await sha256Hex(password);
  return safeEqualHex(actual, expected);
}

export function isUnlocked() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setUnlocked() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // private mode etc. — the gate just re-locks next load
  }
}

export function lock() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
