/* ═══════════════════════════════════════════════════════════
   THE AI RANK · Interactive Layer
   ═══════════════════════════════════════════════════════════ */

/* ─── CONFIG ─── */
// 登録データを外部に保存したい場合、ここにURLを設定してください。
// 空のままだと、localStorage のみに保存されます（ブラウザ内）。
//
// 例：
//  - Google Apps Script Webhook URL
//  - Formspree エンドポイント  (https://formspree.io/f/YOUR_ID)
//  - Vercel / Cloudflare Serverless Function
//  - Supabase / Airtable / Notion API 経由のプロキシ
//
const SIGNUP_WEBHOOK = "/api/signup"; // Vercel Serverless Function (api/signup.js)

const LEVELS = [
  { num: "I",    en: "THE BEGINNER",       ja: "ビギナー",             def: "汎用AIの無料版を、検索・備忘録の延長として使う段階。" },
  { num: "II",   en: "THE POWER USER",     ja: "パワーユーザー",       def: "汎用AIの有料プランと特化業務型AIを、用途別に使い分ける段階。" },
  { num: "III",  en: "THE BOT BUILDER",    ja: "ボットビルダー",       def: "自作AIで自分の業務を再現・自動化・固定化する段階。" },
  { num: "IV",   en: "THE ARTIFACTOR",     ja: "アーティファクター",   def: "Artifacts等で自分ベースのツールを作り、社内外で使われる段階。" },
  { num: "V",    en: "THE VIBE CODER",     ja: "バイブコーダー",       def: "自然言語主導で、社内ツール・簡易な社外ツールを作って本番運用する段階。" },
  { num: "VI",   en: "THE AUTOMATOR",      ja: "オートメーター",       def: "業務を分解し、24時間自動稼働のワークフローを社内外で回す段階。" },
  { num: "VII",  en: "THE AGENT MASTER",   ja: "エージェントマスター", def: "事業単位のタスクをAIエージェント群に丸ごと委譲する段階。" },
  { num: "VIII", en: "THE AI ALCHEMIST",   ja: "AIアルケミスト",       def: "AIで創った事業／プロダクトが、現実に収益を生み続ける段階。" },
  { num: "IX",   en: "THE SINGULARIAN",    ja: "シンギュラリアン",     def: "AIが会社そのものを運営し、収益までもが自動化された状態。" },
];

const QUESTIONS = [
  { gatesRank: 1, title: "ChatGPT / Gemini / Copilot — 汎用AIの利用状況", sub: "Your baseline AI usage",
    options: [
      { letter: "A", label: "使ったことがない", score: 0 },
      { letter: "B", label: "無料版をたまに触る程度", score: 1 },
      { letter: "C", label: "無料版を業務で日常的に使っている", score: 2 },
      { letter: "D", label: "有料プランに課金してヘビーに使っている", score: 3 },
    ]},
  { gatesRank: 2, title: "特化業務型AIの使い分け", sub: "Notta / Manus / NotebookLM / Typeless / Perplexity 等",
    options: [
      { letter: "A", label: "使っていない", score: 0 },
      { letter: "B", label: "1〜2種類を試したことがある", score: 1 },
      { letter: "C", label: "3種類以上を用途別に常用している", score: 2 },
      { letter: "D", label: "10種類以上を完璧に使い分け、比較検討もできる", score: 3 },
    ]},
  { gatesRank: 3, title: "自作AIボットで業務を固定化", sub: "GPTs / Gems / Claude Projects",
    options: [
      { letter: "A", label: "作ったことがない", score: 0 },
      { letter: "B", label: "1〜2つ作って自分用に使っている", score: 1 },
      { letter: "C", label: "複数作り、定型業務の50%以上を任せている", score: 2 },
      { letter: "D", label: "社内や他人にも配布され、チームが常用している", score: 3 },
    ]},
  { gatesRank: 4, title: "Artifactsで公開可能なミニアプリ", sub: "Claude Artifacts / ChatGPT Canvas / Lovable / v0",
    options: [
      { letter: "A", label: "ない", score: 0 },
      { letter: "B", label: "試したが公開・運用には至っていない", score: 1 },
      { letter: "C", label: "自分ベースで作り、業務で活用している", score: 2 },
      { letter: "D", label: "社内・社外で第三者に実際に使われているアプリがある", score: 3 },
    ]},
  { gatesRank: 5, title: "本番運用中のWebアプリ", sub: "Cursor / Lovable / Bolt / Claude Code",
    options: [
      { letter: "A", label: "ない", score: 0 },
      { letter: "B", label: "プロトタイプだけ作った", score: 1 },
      { letter: "C", label: "社内で毎日使われている本番ツールがある", score: 2 },
      { letter: "D", label: "有料ユーザー付きSaaS、または複数アプリを本番運用", score: 3 },
    ]},
  { gatesRank: 6, title: "24時間自動稼働のワークフロー", sub: "Dify / Dify Auto / n8n / Make / Zapier / MCP",
    options: [
      { letter: "A", label: "ない", score: 0 },
      { letter: "B", label: "数本あるが効果は未検証", score: 1 },
      { letter: "C", label: "社内で稼働し、数字で効果が語れる", score: 2 },
      { letter: "D", label: "社内外で複数稼働し、クライアント業務も回している", score: 3 },
    ]},
  { gatesRank: 7, title: "AIエージェントへの事業タスク委譲", sub: "Claude Code / Codex / Managed Agents / MCP",
    options: [
      { letter: "A", label: "試したことがない", score: 0 },
      { letter: "B", label: "個人プロジェクトで試している", score: 1 },
      { letter: "C", label: "業務の一部で本番運用している", score: 2 },
      { letter: "D", label: "事業全体を委譲、MCP/Skills/Hooksを自作・公開している", score: 3 },
    ]},
  { gatesRank: 8, title: "AIプロダクトからの収益化", sub: "SaaS / 基幹システム / プロダクト群",
    options: [
      { letter: "A", label: "ない", score: 0 },
      { letter: "B", label: "プロトタイプのみ、収益はまだない", score: 1 },
      { letter: "C", label: "社内基幹 or 小規模課金ユーザーがいる", score: 2 },
      { letter: "D", label: "MRRが立つAI-native SaaS、または大規模基幹システム運用中", score: 3 },
    ]},
  { gatesRank: 9, title: "会社そのもののAI自律運営", sub: "経営・営業・開発・CSが自律実行、収益も自動化",
    options: [
      { letter: "A", label: "いいえ", score: 0 },
      { letter: "B", label: "一部機能だけ自律稼働", score: 1 },
      { letter: "C", label: "多くの機能が自律、人間の関与は最小限", score: 2 },
      { letter: "D", label: "AIが会社そのものを運営し、収益まで自動化されている", score: 3 },
    ]},
  { gatesRank: 0, title: "他者・業界への貢献", sub: "OSS / 登壇 / 書籍 / メディア / チーム成長への還元",
    options: [
      { letter: "A", label: "自分の業務効率化のみ", score: 0 },
      { letter: "B", label: "社内メンバーにナレッジを共有している", score: 1 },
      { letter: "C", label: "社外にも発信している（SNS・ブログ等）", score: 2 },
      { letter: "D", label: "OSS・書籍・登壇等で業界全体に還元している", score: 3 },
    ]},
];

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* Safe DOM builder */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

/* ═══════════════════════════════════════════
   1. CURSOR
   ═══════════════════════════════════════════ */
(function cursor() {
  if (matchMedia("(max-width: 900px)").matches) return;
  const outer = $("#cursorOuter");
  const inner = $("#cursorInner");
  if (!outer || !inner) return;
  let mx = innerWidth / 2, my = innerHeight / 2, ox = mx, oy = my;
  document.addEventListener("mousemove", (e) => {
    mx = e.clientX; my = e.clientY;
    inner.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });
  (function raf() {
    ox += (mx - ox) * 0.18;
    oy += (my - oy) * 0.18;
    outer.style.transform = `translate(${ox}px, ${oy}px) translate(-50%, -50%)`;
    requestAnimationFrame(raf);
  })();
  const hoverables = "a, button, input, label, .type-card, .cr-row, .ent-card, .share-btn, .cta-button, .tier, .diag-option, .step-btn, .hero-cta";
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest(hoverables)) document.body.classList.add("cursor-hover");
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(hoverables)) document.body.classList.remove("cursor-hover");
  });
  document.addEventListener("mousedown", () => document.body.classList.add("cursor-press"));
  document.addEventListener("mouseup", () => document.body.classList.remove("cursor-press"));
})();

/* ═══════════════════════════════════════════
   2. SCROLL PROGRESS + MASTHEAD + FOLIO
   ═══════════════════════════════════════════ */
(function scrollUI() {
  const bar = $("#scrollBar");
  const masthead = $(".masthead");
  const folio = $("#folioDisplay");
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const pct = Math.min(100, (scrollY / max) * 100);
    if (bar) bar.style.width = pct + "%";
    if (masthead) {
      if (scrollY > innerHeight * 0.4) masthead.classList.add("visible");
      else masthead.classList.remove("visible");
    }
    if (folio) {
      const levels = $$(".level");
      const viewMid = scrollY + innerHeight * 0.35;
      let curr = "00";
      for (const l of levels) {
        if (viewMid >= l.offsetTop && viewMid < l.offsetTop + l.offsetHeight) {
          curr = l.dataset.level; break;
        }
      }
      folio.textContent = `${curr} / IX`;
    }
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* ═══════════════════════════════════════════
   3. REVEAL
   ═══════════════════════════════════════════ */
(function reveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("in");
        io.unobserve(en.target);
      }
    });
  }, { rootMargin: "-10% 0px -10% 0px", threshold: 0.05 });
  $$(".level, .prologue, .pyramid-section, .crossroads, .diagnosis, .enterprise, .principles, .colophon, .reveal-on-scroll").forEach((el) => io.observe(el));
})();

/* ═══════════════════════════════════════════
   4. MULTI-STEP DIAGNOSIS
   ═══════════════════════════════════════════ */
(function diagnosis() {
  const wrapper   = $("#diagWrapper");
  const quizEl    = $("#diagQuiz");
  const nameInput = $("#diagName");
  const beginBtn  = $("#beginBtn");
  const prevBtn   = $("#prevBtn");
  const nextBtn   = $("#nextBtn");
  const progress  = $("#diagProgress");
  const progFill  = $("#progressFill");
  const stepNow   = $("#stepNow");
  const stepTotal = $("#stepTotal");
  const nav       = $("#diagNav");
  const retakeBtn = $("#retakeBtn");

  if (!wrapper || !quizEl) return;

  let answers = new Array(QUESTIONS.length).fill(null);
  let current = 0;
  let autoAdvanceTimer = null;

  function scheduleAutoAdvance(fromIdx) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(() => {
      if (current !== fromIdx + 1) return;
      if (typeof current === "number" && current < QUESTIONS.length) {
        setActive(current + 1);
      } else if (current === QUESTIONS.length) {
        setActive("final");
      }
      // No scrollIntoView — steps are grid-stacked in-place, no navigation needed
    }, 350);
  }

  /* Build quiz DOM safely */
  QUESTIONS.forEach((q, idx) => {
    const step = el("div", { class: "diag-step diag-question", dataset: { step: String(idx + 1) } });

    const inner = el("div", { class: "step-inner" });

    // Back button (top-left of each question card)
    const qBackBtn = el("button", { type: "button", class: "step-back-btn", "aria-label": "前の質問に戻る" },
      el("span", { class: "mono" }, "←"),
      el("span", { class: "back-label" }, idx === 0 ? "氏名入力に戻る" : "前の質問"),
    );
    qBackBtn.addEventListener("click", () => {
      if (idx === 0) setActive(0);
      else setActive(idx); // idx is 0-based; current step number is idx+1, so idx itself is "previous question"
    });
    inner.appendChild(qBackBtn);

    inner.appendChild(el("p", { class: "step-kicker mono" }, `QUESTION · ${String(idx + 1).padStart(2, "0")} / ${QUESTIONS.length}`));
    inner.appendChild(el("h3", { class: "step-title" }, q.title));
    inner.appendChild(el("p", { class: "diag-question-sub mono" }, q.sub));

    const optionsWrap = el("div", { class: "diag-options", role: "radiogroup", "aria-label": q.title });
    q.options.forEach((o) => {
      const input = el("input", { type: "radio", name: `q${idx + 1}`, value: String(o.score) });
      const optEl = el("label", { class: "diag-option", dataset: { letter: o.letter, score: String(o.score) } },
        input,
        el("span", { class: "opt-letter" }, o.letter),
        el("span", { class: "opt-text" }, o.label),
      );
      // Use `change` event so keyboard (arrow keys, space) works too
      input.addEventListener("change", () => {
        if (!input.checked) return;
        optionsWrap.querySelectorAll(".diag-option").forEach((o2) => o2.classList.remove("selected"));
        optEl.classList.add("selected");
        answers[idx] = o.score;
        nextBtn.disabled = false;
        persist();
        scheduleAutoAdvance(idx);
      });
      optionsWrap.appendChild(optEl);
    });
    inner.appendChild(optionsWrap);
    step.appendChild(inner);
    quizEl.appendChild(step);
  });

  /* Hydrate name + answers from localStorage */
  let savedCurrent = 0;
  try {
    const saved = JSON.parse(localStorage.getItem("airank:v2") || "{}");
    if (saved.name) nameInput.value = saved.name;
    if (Array.isArray(saved.answers) && saved.answers.length === QUESTIONS.length) {
      answers = saved.answers.slice();
      // Reapply selected visuals
      answers.forEach((score, idx) => {
        if (score == null) return;
        const match = quizEl.querySelector(`.diag-step[data-step="${idx + 1}"] .diag-option[data-score="${score}"]`);
        if (match) {
          match.classList.add("selected");
          const input = match.querySelector("input");
          if (input) input.checked = true;
        }
      });
    }
    // Don't auto-resume mid-quiz — always start at step 0 to show name field.
    // But remember last step for potential "continue" UX in the future.
    savedCurrent = 0;
  } catch (e) {}

  /* Serial + date */
  let serial = localStorage.getItem("airank:serial");
  if (!serial) {
    serial = Array.from({ length: 3 }, () => Math.random().toString(36).slice(2, 6).toUpperCase()).join("-");
    localStorage.setItem("airank:serial", serial);
  }
  const certSerial = $("#certSerial");
  if (certSerial) certSerial.textContent = serial;
  const certDate = $("#certDate");
  if (certDate) {
    const d = new Date();
    certDate.textContent = `${d.getFullYear()} / ${String(d.getMonth() + 1).padStart(2, "0")} / ${String(d.getDate()).padStart(2, "0")}`;
  }

  function persist() {
    try { localStorage.setItem("airank:v2", JSON.stringify({ name: nameInput.value, current, answers })); } catch (e) {}
  }

  function setActive(which) {
    // Cancel any pending auto-advance when switching
    clearTimeout(autoAdvanceTimer);

    current = which;
    $$(".diag-step", wrapper).forEach((s) => s.removeAttribute("data-active"));

    if (which === 0) {
      wrapper.querySelector('.diag-step[data-step="0"]').setAttribute("data-active", "true");
      progress.classList.remove("active");
      nav.classList.remove("active");
    } else if (which === "final") {
      wrapper.querySelector('.diag-step[data-step="final"]').setAttribute("data-active", "true");
      progress.classList.remove("active");
      nav.classList.remove("active");
      renderResult();
    } else {
      const elStep = quizEl.querySelector(`.diag-step[data-step="${which}"]`);
      if (elStep) elStep.setAttribute("data-active", "true");
      progress.classList.add("active");
      nav.classList.add("active");
      stepNow.textContent = String(which);
      stepTotal.textContent = String(QUESTIONS.length);
      progFill.style.width = ((which / QUESTIONS.length) * 100) + "%";
      nextBtn.disabled = answers[which - 1] === null;
      // Restore selected visual
      const prevSel = quizEl.querySelector(`.diag-step[data-step="${which}"] .diag-option.selected`);
      if (!prevSel && answers[which - 1] !== null) {
        const match = quizEl.querySelector(`.diag-step[data-step="${which}"] .diag-option[data-score="${answers[which - 1]}"]`);
        if (match) match.classList.add("selected");
      }
      // Set next button label on last question
      if (which === QUESTIONS.length) {
        nextBtn.querySelector("span:first-child").textContent = "結果を見る";
      } else {
        nextBtn.querySelector("span:first-child").textContent = "次へ";
      }
    }
    persist();
  }

  function calcRank() {
    let rank = 0;
    for (let i = 0; i < 9; i++) {
      if (answers[i] != null && answers[i] >= 2) rank = Math.max(rank, QUESTIONS[i].gatesRank);
    }
    return { rank, bonus: answers[9] ?? 0 };
  }

  function renderResult() {
    const { rank, bonus } = calcRank();
    const nameVal = (nameInput.value || "").trim();
    const certName = $("#certName");
    const certNumeral = $("#certNumeral");
    const certTitleEn = $("#certTitleEn");
    const certTitleJa = $("#certTitleJa");
    const certDef = $("#certDefinition");
    const resultLabelJa = $("#resultLabelJa");
    const resultDesc = $("#resultDesc");

    certName.textContent = nameVal ? nameVal.toUpperCase() : "—— ANONYMOUS ——";

    let contribSuffix = "";
    if (bonus >= 2) {
      contribSuffix = " ＋ 業界貢献バッジ取得（OSS・登壇・発信等）。";
    }

    if (rank === 0) {
      certNumeral.textContent = "0";
      certTitleEn.textContent = "THE ASPIRANT";
      certTitleJa.textContent = "前哨";
      certDef.textContent = "まだ旅は始まっていない。しかし、このページに辿り着いたあなたには、第一歩を踏み出す資格がある。";
      resultLabelJa.textContent = "前哨 / ASPIRANT";
      resultDesc.textContent = "AIに触れる旅はこれから。まずはLv.Iのビギナーを目指し、ChatGPT／Gemini／Copilotを毎日起動する習慣から始めましょう。" + contribSuffix;
    } else {
      const lvl = LEVELS[rank - 1];
      certNumeral.textContent = lvl.num;
      certTitleEn.textContent = lvl.en;
      certTitleJa.textContent = lvl.ja;
      certDef.textContent = lvl.def;
      resultLabelJa.textContent = lvl.ja;
      const nextLvl = rank < 9 ? LEVELS[rank] : null;
      const base = nextLvl
        ? `${lvl.def} 次の段階 Lv.${nextLvl.num} ・${nextLvl.en} へ進むには、${nextLvl.def}`
        : `${lvl.def} これ以上の段階は存在しません。あなたは頂点に到達しました。`;
      resultDesc.textContent = base + contribSuffix;
    }

    try {
      localStorage.setItem("airank:v2", JSON.stringify({
        name: nameVal, current: "final", answers, rank, bonus, at: Date.now(),
      }));
    } catch (e) {}
  }

  beginBtn?.addEventListener("click", () => setActive(1));

  prevBtn?.addEventListener("click", () => {
    if (current === "final") { setActive(QUESTIONS.length); return; }
    if (typeof current === "number" && current > 1) setActive(current - 1);
    else setActive(0);
  });

  nextBtn?.addEventListener("click", () => {
    if (typeof current === "number" && current < QUESTIONS.length) {
      setActive(current + 1);
    } else if (current === QUESTIONS.length) {
      setActive("final");
    }
  });

  retakeBtn?.addEventListener("click", () => {
    answers = new Array(QUESTIONS.length).fill(null);
    quizEl.querySelectorAll(".diag-option.selected").forEach((o) => o.classList.remove("selected"));
    quizEl.querySelectorAll('input[type="radio"]').forEach((r) => { r.checked = false; });
    setActive(0);
    try { localStorage.removeItem("airank:v2"); } catch (e) {}
  });

  // Back from result → last question (keeps answers)
  $("#backToQuizBtn")?.addEventListener("click", () => {
    setActive(QUESTIONS.length);
  });

  function isAuthed() { return !!localStorage.getItem("airank:auth"); }
  function doShareX() {
    const lvlEn = $("#certTitleEn")?.textContent || "";
    const lvlJa = $("#certTitleJa")?.textContent || "";
    const num = $("#certNumeral")?.textContent || "";
    const nmRaw = (nameInput?.value || "").trim();
    // Map numeral → rank integer for URL
    const ROMAN_TO_N = { "0":0, "I":1, "II":2, "III":3, "IV":4, "V":5, "VI":6, "VII":7, "VIII":8, "IX":9, "—":0 };
    const rankInt = ROMAN_TO_N[num] ?? 0;
    const text =
`🎖️ 私のAIランクは Lv.${num}「${lvlJa}」でした。

9段階で AI活用スキルを格付けする
"THE AI RANK" で診断してみました📊

▶ ${lvlEn}

あなたのランクは？👇`;
    // Use per-rank cert page so X shows the rank-specific certificate preview
    const certParams = new URLSearchParams({ rank: String(rankInt) });
    if (nmRaw) certParams.set("name", nmRaw);
    const url = `${location.origin}/c?${certParams.toString()}`;
    const hashtags = "TheAIRank,AI格付けランク";
    const via = "masahirochaen";
    const params = new URLSearchParams({ text, url, hashtags, via });
    window.open(`https://twitter.com/intent/tweet?${params.toString()}`, "_blank", "noopener");
  }
  function doShareLinkedIn() {
    const url = location.href;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank", "noopener");
  }
  function doDownload() { toast("証明書を保存しました（デモ実装）"); }

  $("#shareX")?.addEventListener("click", () => { if (!isAuthed()) return openModal("share-x"); doShareX(); });
  $("#shareLinkedIn")?.addEventListener("click", () => { if (!isAuthed()) return openModal("share-li"); doShareLinkedIn(); });
  $("#downloadPng")?.addEventListener("click", () => { if (!isAuthed()) return openModal("download"); doDownload(); });
  window.__airank_share = { doShareX, doShareLinkedIn, doDownload };

  nameInput?.addEventListener("input", () => {
    const certName = $("#certName");
    if (certName) certName.textContent = (nameInput.value.trim() || "—— ANONYMOUS ——").toUpperCase();
    persist();
  });

  setActive(0);
})();

/* ═══════════════════════════════════════════
   5. MODAL
   ═══════════════════════════════════════════ */
function openModal(intent) {
  const modal = document.getElementById("signupModal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  modal.dataset.intent = intent || "";
  document.body.style.overflow = "hidden";
}
function closeModal() {
  const modal = document.getElementById("signupModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
(function modalWiring() {
  const modal = document.getElementById("signupModal");
  if (!modal) return;
  modal.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });

  const form = document.getElementById("emailForm");
  const nameI = document.getElementById("regName");
  const emailI = document.getElementById("regEmail");
  const companyI = document.getElementById("regCompany");

  // Hydrate from prior registration if exists
  try {
    const saved = JSON.parse(localStorage.getItem("airank:auth") || "{}");
    if (saved.name && nameI) nameI.value = saved.name;
    if (saved.email && emailI) emailI.value = saved.email;
    if (saved.company && companyI) companyI.value = saved.company;
  } catch (e) {}

  function completeAuth(data) {
    // Strip hp (honeypot) from persisted payload — we only send it to the API
    const { hp, ...rest } = data;
    const payload = {
      ...rest,
      hp,
      at: Date.now(),
      rank: (() => { try { return JSON.parse(localStorage.getItem("airank:v2") || "{}").rank; } catch(e){ return null; } })(),
      referrer: document.referrer || "",
      url: location.href,
      ua: navigator.userAgent,
    };
    // 1) Local storage (always)
    localStorage.setItem("airank:auth", JSON.stringify(payload));
    // 2) Remote webhook (if configured)
    if (SIGNUP_WEBHOOK) {
      fetch(SIGNUP_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        mode: "cors",
        keepalive: true,
      }).catch(() => {});
    }
    const intent = modal.dataset.intent;
    closeModal();
    toast(`ようこそ · ${data.name || data.email}`);
    setTimeout(() => {
      if (intent === "share-x") window.__airank_share.doShareX();
      else if (intent === "share-li") window.__airank_share.doShareLinkedIn();
      else if (intent === "download") window.__airank_share.doDownload();
    }, 500);
  }

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = (nameI?.value || "").trim();
    const email = (emailI?.value || "").trim();
    const company = (companyI?.value || "").trim();
    const hp = (document.getElementById("hp")?.value || "").trim();
    if (!name) { toast("氏名を入力してください"); nameI?.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { toast("有効なメールアドレスを入力してください"); emailI?.focus(); return; }
    completeAuth({ name, email, company, hp });
  });
})();

/* ═══════════════════════════════════════════
   6. TOAST
   ═══════════════════════════════════════════ */
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

/* ═══════════════════════════════════════════
   7. HERO PARALLAX
   ═══════════════════════════════════════════ */
(function heroParallax() {
  const hero = document.querySelector(".hero");
  const title = document.querySelector(".masthead-title");
  if (!hero || !title) return;
  addEventListener("scroll", () => {
    const y = Math.min(scrollY, innerHeight);
    const p = y / innerHeight;
    title.style.transform = `translateY(${y * 0.15}px)`;
    title.style.opacity = String(1 - p * 0.8);
  }, { passive: true });
})();

/* ═══════════════════════════════════════════
   8. MAGNETIC
   ═══════════════════════════════════════════ */
(function magnetic() {
  if (matchMedia("(max-width: 900px)").matches) return;
  document.querySelectorAll(".cta-button, .share-btn:not([disabled]), .auth-btn, .pyramid-cta-btn, .hero-cta").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.08}px, ${y * 0.12}px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });
})();

/* ═══════════════════════════════════════════
   9. SMOOTH ANCHOR
   ═══════════════════════════════════════════ */
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute("href");
  if (id === "#" || id.length < 2) return;
  const target = document.querySelector(id);
  if (target) {
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
