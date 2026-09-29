const UPSTREAM_URL = "https://infintrading-hooks.vercel.app/api/approve";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.APPROVE_SECRET;
  if (!secret) return res.status(503).json({ error: "Approval service is not configured" });

  const { company = "", url = "" } = req.body || {};
  if (typeof company !== "string" || typeof url !== "string" || (!company && !url)) {
    return res.status(400).json({ error: "A company or URL is required" });
  }

  try {
    const upstream = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, url, secret }),
    });
    const text = await upstream.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text.slice(0, 500) };
    }
    return res.status(upstream.status).json(payload);
  } catch {
    return res.status(502).json({ error: "Approval service unavailable" });
  }
}
