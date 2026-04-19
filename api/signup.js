// Vercel Serverless Function
// POST /api/signup — 登録データを Supabase に保存（+ ログ + 任意で外部転送）
//
// セキュリティ:
//   - Origin / Referer の制限（クロスオリジンを拒否）
//   - ハニーポット（hp フィールドに値が入っていたらボット扱いで静かに成功扱い）
//   - 軽量レートリミット（同一IPで短時間に多数の送信をブロック）
//   - メールアドレスの厳密バリデーション
//   - 最大文字数制限
//
// 保存先:
//   - Supabase `signups` テーブル（SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY が設定されていれば）
//   - Vercel Dashboard → Logs（常時）
//   - 任意: 環境変数 SIGNUP_FORWARD_URL

import { supabase, supabaseEnabled } from "./_supabase.js";

const ALLOWED_ORIGINS = new Set([
  "https://ai-rank.org",
  "https://www.ai-rank.org",
  "https://the-ai-rank.vercel.app",
  "http://localhost:4173",
  "http://localhost:3000",
  "http://localhost:5173",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_NAME = 100;
const MAX_EMAIL = 200;
const MAX_COMPANY = 200;
const MAX_UA = 500;

// Very light per-IP throttle using module-scoped memory.
// Works per serverless-instance only; good enough as a first line of defense.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;
const ipHits = new Map();

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  if (typeof req.headers["x-real-ip"] === "string") return req.headers["x-real-ip"];
  return "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  // Opportunistic cleanup
  if (ipHits.size > 1000) {
    for (const [k, arr] of ipHits) {
      const fresh = arr.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (fresh.length === 0) ipHits.delete(k);
      else ipHits.set(k, fresh);
    }
  }
  return false;
}

export default async function handler(req, res) {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
  const referer = typeof req.headers.referer === "string" ? req.headers.referer : "";
  const isAllowed = origin === "" || ALLOWED_ORIGINS.has(origin);

  // CORS
  if (origin && ALLOWED_ORIGINS.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Origin enforcement: block unknown origins
  if (origin && !isAllowed) {
    console.warn("[AIRANK:blocked_origin]", origin);
    return res.status(403).json({ error: "Origin not allowed" });
  }

  // Referer sanity: if present, must come from an allowed domain
  if (referer) {
    try {
      const url = new URL(referer);
      const refOrigin = `${url.protocol}//${url.host}`;
      if (!ALLOWED_ORIGINS.has(refOrigin)) {
        console.warn("[AIRANK:blocked_referer]", refOrigin);
        return res.status(403).json({ error: "Referer not allowed" });
      }
    } catch (e) { /* malformed referer — ignore */ }
  }

  // Rate limit (by IP)
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    console.warn("[AIRANK:rate_limited]", ip);
    return res.status(429).json({ error: "Too many requests" });
  }

  try {
    const body = req.body || {};

    // Honeypot — if filled, pretend success without storing anything.
    const honeypot = typeof body.hp === "string" ? body.hp.trim() : "";
    if (honeypot.length > 0) {
      console.warn("[AIRANK:honeypot]", ip);
      return res.status(200).json({ ok: true });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const company = typeof body.company === "string" ? body.company.trim() : "";
    const ua = typeof body.ua === "string" ? body.ua.slice(0, MAX_UA) : "";

    if (!name) return res.status(400).json({ error: "name is required" });
    if (name.length > MAX_NAME) return res.status(400).json({ error: "name too long" });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "valid email is required" });
    if (email.length > MAX_EMAIL) return res.status(400).json({ error: "email too long" });
    if (company.length > MAX_COMPANY) return res.status(400).json({ error: "company too long" });

    // Reject suspicious email domains (e.g. tempmail common sites)
    const lowerEmail = email.toLowerCase();
    const suspiciousDomains = ["mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com", "throwaway.email"];
    if (suspiciousDomains.some((d) => lowerEmail.endsWith("@" + d))) {
      console.warn("[AIRANK:temp_mail]", email);
      return res.status(400).json({ error: "disposable email addresses are not allowed" });
    }

    const rankNum = Number(body.rank);
    const record = {
      name: name.slice(0, MAX_NAME),
      email: email.slice(0, MAX_EMAIL),
      company: company.slice(0, MAX_COMPANY),
      rank: Number.isFinite(rankNum) ? rankNum : null,
      client_at: Number.isFinite(body.at) ? new Date(body.at).toISOString() : null,
      url: typeof body.url === "string" ? body.url.slice(0, 500) : "",
      referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 500) : "",
      user_agent: ua,
      ip,
    };

    // 1) Vercel Logs — minimal, non-PII log line for observability only.
    //    Never log raw email/name/company/UA. Use hashed/masked fields instead
    //    so ops can diagnose issues without leaking personal data into log retention.
    const emailDomain = email.split("@")[1] || "";
    const emailMasked = email ? `${email[0]}***@${emailDomain}` : "";
    console.log("[AIRANK:signup]", JSON.stringify({
      at: new Date().toISOString(),
      rank: record.rank,
      email_domain: emailDomain,
      email_masked: emailMasked,
      has_company: Boolean(company),
      url: record.url,
      ip_present: Boolean(ip && ip !== "unknown"),
    }));

    // 2) Supabase — primary persistent store
    let stored = null;
    if (supabaseEnabled) {
      try {
        const { error } = await supabase.from("signups").insert(record);
        if (error) {
          stored = false;
          console.error("[AIRANK:supabase_insert_failed]", error.message || error);
        } else {
          stored = true;
        }
      } catch (e) {
        stored = false;
        console.error("[AIRANK:supabase_exception]", e?.message || e);
      }
    } else {
      console.warn("[AIRANK:supabase_not_configured] set SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY");
    }

    // 3) Optional external forwarding (Slack / Google Sheets / Notion etc.)
    const FORWARD_URL = process.env.SIGNUP_FORWARD_URL || "";
    let forwarded = null;
    if (FORWARD_URL) {
      try {
        const resp = await fetch(FORWARD_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        forwarded = resp.ok;
        if (!resp.ok) console.error("[AIRANK:forward_non2xx]", resp.status, resp.statusText);
      } catch (e) {
        forwarded = false;
        console.error("[AIRANK:forward_failed]", e?.message || e);
      }
    }

    return res.status(200).json({ ok: true, stored, forwarded });
  } catch (err) {
    console.error("[AIRANK:signup_error]", err?.message || err);
    return res.status(500).json({ error: "internal error" });
  }
}
