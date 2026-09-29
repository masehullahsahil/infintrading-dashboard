import crypto from "node:crypto";

const COOKIE = "infintrading_session";
const MAX_AGE = 60 * 60 * 12;

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function signature(value) {
  return crypto.createHmac("sha256", process.env.DASHBOARD_SESSION_SECRET || "").update(value).digest("hex");
}

function validPassword(password) {
  const expected = (process.env.DASHBOARD_PASSWORD_SHA256 || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expected) || typeof password !== "string") return false;
  const actual = Buffer.from(digest(password), "hex");
  const wanted = Buffer.from(expected, "hex");
  return actual.length === wanted.length && crypto.timingSafeEqual(actual, wanted);
}

function makeToken() {
  const issued = Math.floor(Date.now() / 1000);
  const body = `${issued}.${crypto.randomBytes(18).toString("hex")}`;
  return `${body}.${signature(body)}`;
}

function isValidToken(token) {
  if (!token || !process.env.DASHBOARD_SESSION_SECRET) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [issued, nonce, mac] = parts;
  const body = `${issued}.${nonce}`;
  const age = Math.floor(Date.now() / 1000) - Number(issued);
  if (!/^\d+$/.test(issued) || age < 0 || age > MAX_AGE) return false;
  const expected = Buffer.from(signature(body), "hex");
  const actual = Buffer.from(mac, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ configured: Boolean(process.env.DASHBOARD_PASSWORD_SHA256 && process.env.DASHBOARD_SESSION_SECRET), authenticated: isValidToken(cookies(req)[COOKIE]) });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const action = req.body?.action;
  if (action === "logout") {
    res.setHeader("Set-Cookie", `${COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`);
    return res.status(200).json({ authenticated: false });
  }
  if (action !== "login" || !validPassword(req.body?.password) || !process.env.DASHBOARD_SESSION_SECRET) {
    return res.status(401).json({ error: "Invalid credentials or auth is not configured" });
  }

  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(makeToken())}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Strict`);
  return res.status(200).json({ authenticated: true });
}
