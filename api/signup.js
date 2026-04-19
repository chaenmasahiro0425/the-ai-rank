// Vercel Serverless Function
// POST /api/signup — 登録データを受け取り、ログ＋オプションで外部転送
//
// ログは Vercel Dashboard → Logs で確認できます。
// 外部転送先（Slack / Notion / Google Sheets 等）は環境変数
// SIGNUP_FORWARD_URL に設定してください。

const ALLOWED_ORIGINS = new Set([
  "https://ai-rank.org",
  "https://www.ai-rank.org",
  "https://the-ai-rank.vercel.app",
  "http://localhost:4173",
  "http://localhost:3000",
  "http://localhost:5173",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const isAllowed = ALLOWED_ORIGINS.has(origin);

  // CORS
  if (isAllowed) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Same-origin requests may not send Origin header; allow if host matches deployed domain.
  // Cross-origin with unknown Origin: deny.
  if (origin && !isAllowed) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  try {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const company = typeof body.company === "string" ? body.company.trim() : "";

    if (!name) return res.status(400).json({ error: "name is required" });
    if (name.length > 100) return res.status(400).json({ error: "name too long" });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "valid email is required" });
    if (company.length > 200) return res.status(400).json({ error: "company too long" });

    const record = {
      name: name.slice(0, 100),
      email: email.slice(0, 200),
      company: company.slice(0, 200),
      rank: body.rank ?? null,
      at: Number.isFinite(body.at) ? body.at : Date.now(),
      url: typeof body.url === "string" ? body.url.slice(0, 500) : "",
      referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 500) : "",
      ua: typeof body.ua === "string" ? body.ua.slice(0, 500) : "",
      ip: req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "",
      receivedAt: new Date().toISOString(),
    };

    // 1) Vercel Logs
    console.log("[AIRANK:signup]", JSON.stringify(record));

    // 2) 外部転送（任意）
    const FORWARD_URL = process.env.SIGNUP_FORWARD_URL || "";
    let forwarded = null;
    if (FORWARD_URL) {
      try {
        const r = await fetch(FORWARD_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        forwarded = r.ok;
        if (!r.ok) console.error("[AIRANK:forward_non2xx]", r.status, r.statusText);
      } catch (e) {
        forwarded = false;
        console.error("[AIRANK:forward_failed]", e?.message || e);
      }
    }

    return res.status(200).json({ ok: true, forwarded });
  } catch (err) {
    console.error("[AIRANK:signup_error]", err?.message || err);
    return res.status(500).json({ error: "internal error" });
  }
}
