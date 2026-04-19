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
    if (!company) return res.status(400).json({ error: "company is required" });
    if (company.length > MAX_COMPANY) return res.status(400).json({ error: "company too long" });

    // Reject disposable / throwaway email domains.
    // Expanded list covering common providers + their common subdomain variants.
    const lowerEmail = email.toLowerCase();
    const emailDomainPart = lowerEmail.split("@")[1] || "";
    const disposableDomains = new Set([
      // mailinator family
      "mailinator.com", "mailinator.net", "mailinator2.com", "mailinator2.net",
      // 10minutemail family
      "10minutemail.com", "10minutemail.net", "20minutemail.com",
      // tempmail family
      "tempmail.com", "tempmail.net", "tempmail.org", "tempmail.plus", "temp-mail.org", "temp-mail.io",
      // guerrilla
      "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "grr.la", "sharklasers.com",
      // yopmail
      "yopmail.com", "yopmail.net", "yopmail.fr", "cool.fr.nf", "jetable.fr.nf",
      // throwaway
      "throwaway.email", "trashmail.com", "throwawaymail.com", "fakeinbox.com",
      // getnada
      "getnada.com", "nada.email", "inboxbear.com",
      // dropmail / others
      "dropmail.me", "emailondeck.com", "maildrop.cc", "moakt.com",
      "mailcatch.com", "mailnesia.com", "harakirimail.com",
      "mohmal.com", "emailfake.com", "mintemail.com", "mytemp.email",
      "spambox.us", "trbvm.com", "spambog.com",
      // burner / disposable
      "burnermail.io", "anonaddy.me", "simplelogin.co",
      // mail.tm
      "mail.tm", "linuxmail.org",
    ]);
    if (disposableDomains.has(emailDomainPart)) {
      console.warn("[AIRANK:temp_mail]", emailDomainPart);
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
    if (supabaseEnabled) {
      try {
        const { error } = await supabase.from("signups").insert(record);
        if (error) {
          console.error("[AIRANK:supabase_insert_failed]", error.message || error);
        }
      } catch (e) {
        console.error("[AIRANK:supabase_exception]", e?.message || e);
      }
    } else {
      console.warn("[AIRANK:supabase_not_configured] set SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY");
    }

    // 3) Optional external forwarding (Slack / Google Sheets / Notion etc.)
    //    SSRF guard: require https and a non-private host. Accidental/malicious
    //    misconfiguration should not be able to point this at internal metadata.
    const FORWARD_URL = process.env.SIGNUP_FORWARD_URL || "";
    if (FORWARD_URL) {
      let parsed = null;
      try { parsed = new URL(FORWARD_URL); } catch (e) { /* ignore */ }
      const rawHost = parsed?.hostname || "";
      // Node keeps brackets on IPv6 literals (`[::1]`). Strip them so we can
      // match exact addresses, and detect IPv6 separately from DNS names so
      // that e.g. `fc2.com` isn't mistaken for an `fc00::/7` ULA literal.
      const isIpv6Literal = rawHost.startsWith("[") && rawHost.endsWith("]");
      const host = isIpv6Literal ? rawHost.slice(1, -1).toLowerCase() : rawHost.toLowerCase();
      const isPrivateIpv4 =
        /^127\./.test(host) ||
        /^169\.254\./.test(host) ||
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
      const isPrivateIpv6 = isIpv6Literal && (
        host === "::1" ||
        host === "::" ||
        /^fe[89ab][0-9a-f]?:/.test(host) ||   // fe80::/10 link-local
        /^f[cd][0-9a-f]{0,2}:/.test(host)      // fc00::/7 ULA
      );
      const isPrivate =
        host === "localhost" ||
        host === "metadata.google.internal" ||
        host.endsWith(".local") ||
        host.endsWith(".internal") ||
        isPrivateIpv4 ||
        isPrivateIpv6;

      if (!parsed || parsed.protocol !== "https:" || isPrivate) {
        console.error("[AIRANK:forward_blocked]", parsed?.protocol || "invalid", rawHost || "(none)");
      } else {
        try {
          const resp = await fetch(parsed.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(record),
          });
          if (!resp.ok) console.error("[AIRANK:forward_non2xx]", resp.status, resp.statusText);
        } catch (e) {
          console.error("[AIRANK:forward_failed]", e?.message || e);
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[AIRANK:signup_error]", err?.message || err);
    return res.status(500).json({ error: "internal error" });
  }
}
