const SESSION_KEY = "infintrading-dashboard-unlocked";

// Authentication is intentionally server-backed. No password hash or approval
// secret is bundled into the client.
export function isGateConfigured() {
  return true;
}

export async function checkSession() {
  try {
    const response = await fetch("/api/auth", { credentials: "same-origin" });
    const data = await response.json();
    return {
      configured: Boolean(data.configured),
      authenticated: Boolean(data.authenticated),
    };
  } catch {
    return { configured: false, authenticated: false };
  }
}

export async function login(password) {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", password }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function logout() {
  try {
    await fetch("/api/auth", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
  } catch {
    // The server session expires independently if the network is unavailable.
  }
}

// Kept as a compatibility helper for existing callers/tests. Unlock state is
// no longer trusted from localStorage.
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
    // The HttpOnly server cookie remains authoritative.
  }
}

export function lock() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
