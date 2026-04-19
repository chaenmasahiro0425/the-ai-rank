// Vercel Serverless Function — Certificate share page
// GET /api/cert?rank=N[&name=...]
// Returns an HTML page with rank-specific OG tags for X/Twitter preview.

const LEVELS = {
  0: { en: "THE ASPIRANT",     ja: "前哨" },
  1: { en: "THE BEGINNER",     ja: "ビギナー" },
  2: { en: "THE POWER USER",   ja: "パワーユーザー" },
  3: { en: "THE BOT BUILDER",  ja: "ボットビルダー" },
  4: { en: "THE ARTIFACTOR",   ja: "アーティファクター" },
  5: { en: "THE VIBE CODER",   ja: "バイブコーダー" },
  6: { en: "THE AUTOMATOR",    ja: "オートメーター" },
  7: { en: "THE AGENT MASTER", ja: "エージェントマスター" },
  8: { en: "THE AI ALCHEMIST", ja: "AIアルケミスト" },
  9: { en: "THE SINGULARIAN",  ja: "シンギュラリアン" },
};
const ROMAN = ["0","I","II","III","IV","V","VI","VII","VIII","IX"];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function handler(req, res) {
  const rankParam = req.query?.rank ?? "0";
  const rankNum = Math.max(0, Math.min(9, parseInt(rankParam) || 0));
  const level = LEVELS[rankNum];
  const numeral = ROMAN[rankNum];

  const rawName = String(req.query?.name || "").slice(0, 40).trim();
  const name = escapeHtml(rawName);

  const ogImage = `https://ai-rank.org/og/rank-${rankNum}.png`;

  const titlePrefix = name ? `${name} · ` : "";
  const pageTitle = `${titlePrefix}Lv.${numeral} ${level.en} — THE AI RANK`;
  const pageDesc = name
    ? `${name} の AI ランクは Lv.${numeral}「${level.ja}」。あなたのランクは？ 9 段階の公式 AI 格付けで診断してみよう。`
    : `Lv.${numeral}「${level.ja}」— 9 段階の公式 AI 格付けで、あなたのランクを診断してみよう。`;

  // Redirect after short delay; crawlers (X, Facebook, Discord) will read OG tags first
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(pageTitle)}</title>
<meta name="description" content="${escapeHtml(pageDesc)}" />

<meta property="og:title" content="${escapeHtml(pageTitle)}" />
<meta property="og:description" content="${escapeHtml(pageDesc)}" />
<meta property="og:image" content="${ogImage}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="https://ai-rank.org/c?rank=${rankNum}${rawName ? `&name=${encodeURIComponent(rawName)}` : ""}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="THE AI RANK" />
<meta property="og:locale" content="ja_JP" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@masahirochaen" />
<meta name="twitter:creator" content="@masahirochaen" />
<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
<meta name="twitter:description" content="${escapeHtml(pageDesc)}" />
<meta name="twitter:image" content="${ogImage}" />

<link rel="icon" type="image/svg+xml" href="/favicon.svg" />

<style>
  body {
    font-family: "Helvetica Neue", "Hiragino Kaku Gothic ProN", sans-serif;
    background: #F1ECE0; color: #17130F;
    margin: 0; padding: 40px 24px; text-align: center;
    display: flex; align-items: center; justify-content: center; min-height: 100vh;
  }
  .wrap { max-width: 640px; }
  .wrap img { width: 100%; height: auto; margin-bottom: 24px; border: 1px solid rgba(0,0,0,0.12); }
  h1 { font-size: 22px; margin: 0 0 12px; }
  p { font-size: 15px; line-height: 1.6; color: #5C5247; }
  a { color: #8B2514; font-weight: 700; text-decoration: none; }
  .btn { display: inline-block; margin-top: 18px; padding: 14px 28px; background: #17130F; color: #F1ECE0; border: 1px solid #17130F; font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase; }
  .btn:hover { background: #8B2514; border-color: #8B2514; color: #F1ECE0; }
</style>
<meta http-equiv="refresh" content="4;url=https://ai-rank.org/" />
</head>
<body>
<div class="wrap">
  <img src="${ogImage}" alt="${escapeHtml(pageTitle)}" width="1200" height="630" />
  <h1>${escapeHtml(pageTitle)}</h1>
  <p>${escapeHtml(pageDesc)}</p>
  <a class="btn" href="https://ai-rank.org/">診断してランクを知る →</a>
</div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.status(200).send(html);
}
