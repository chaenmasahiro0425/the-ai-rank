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

/* ─── AUTH STORAGE (localStorage with TTL) ───
   Persist autofill/auth data for returning visitors. TTL ensures old
   session data on shared machines eventually expires. */
const AUTH_KEY = "airank:auth";
const AUTH_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function readAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    // Legacy entries (written before TTL was introduced) have no `_expires`.
    // Treat them as expired so returning users re-confirm on shared devices.
    if (!Number.isFinite(obj._expires) || Date.now() > obj._expires) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return obj;
  } catch (e) {
    return null;
  }
}

function writeAuth(obj) {
  try {
    const payload = { ...obj, _expires: Date.now() + AUTH_TTL_MS };
    localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
  } catch (e) { /* quota / disabled — ignore */ }
}

/* ─── FOCUS TRAP ───
   Keep Tab navigation inside an open modal for a11y / screen readers. */
function trapFocus(container) {
  if (!container) return () => {};
  // Exclude tabindex="-1" so honeypot inputs never receive focus.
  const selector = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([type=hidden]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  const lastActive = document.activeElement;

  function onKey(e) {
    if (e.key !== "Tab") return;
    const focusables = container.querySelectorAll(selector);
    if (!focusables.length) { e.preventDefault(); return; }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !container.contains(active)) { last.focus(); e.preventDefault(); }
    } else {
      if (active === last) { first.focus(); e.preventDefault(); }
    }
  }

  container.addEventListener("keydown", onKey);
  return () => {
    container.removeEventListener("keydown", onKey);
    if (lastActive && typeof lastActive.focus === "function") {
      try { lastActive.focus(); } catch (e) {}
    }
  };
}

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

/* Custom cursor removed 2026-04-19 — hover offsets misaligned.
   System cursor is used throughout. */

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
      // Masthead always visible — user needs 無料診断 / お問い合わせ accessible at all times
      masthead.classList.add("visible");
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

    // Top row: back button (left) + forward button (right)
    const qTopRow = el("div", { class: "step-top-row" });

    const qBackBtn = el("button", { type: "button", class: "step-back-btn", "aria-label": "前の質問に戻る" },
      el("span", { class: "mono" }, "←"),
      el("span", { class: "back-label" }, idx === 0 ? "氏名入力に戻る" : "前の質問"),
    );
    qBackBtn.addEventListener("click", () => {
      if (idx === 0) setActive(0);
      else setActive(idx); // idx is 0-based; current step number is idx+1, so idx itself is "previous question"
    });

    const isLast = idx === QUESTIONS.length - 1;
    const qNextBtn = el("button", {
      type: "button",
      class: "step-next-btn",
      disabled: "",
      "aria-label": isLast ? "結果を見る" : "次の質問へ",
    },
      el("span", { class: "next-label" }, isLast ? "結果を見る" : "次の質問"),
      el("span", { class: "mono" }, "→"),
    );
    qNextBtn.addEventListener("click", () => {
      clearTimeout(autoAdvanceTimer);
      if (answers[idx] == null) return;
      if (isLast) setActive("final");
      else setActive(idx + 2);
    });

    qTopRow.appendChild(qBackBtn);
    qTopRow.appendChild(qNextBtn);
    inner.appendChild(qTopRow);
    // Expose for enable/disable on answer change
    step._qNextBtn = qNextBtn;

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
        if (step._qNextBtn) step._qNextBtn.disabled = false;
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
      // Reapply selected visuals + enable next button on already-answered cards
      answers.forEach((score, idx) => {
        if (score == null) return;
        const stepEl = quizEl.querySelector(`.diag-step[data-step="${idx + 1}"]`);
        const match = stepEl?.querySelector(`.diag-option[data-score="${score}"]`);
        if (match) {
          match.classList.add("selected");
          const input = match.querySelector("input");
          if (input) input.checked = true;
        }
        if (stepEl && stepEl._qNextBtn) stepEl._qNextBtn.disabled = false;
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
    try {
      // Compute rank on-the-fly so it's available even before renderResult fires.
      // Mirrors calcRank() — kept inline so persist works standalone.
      let rank = null;
      if (answers.some((a) => a != null)) {
        let r = 0;
        for (let i = 0; i < 9; i++) {
          if (answers[i] != null && answers[i] >= 2) r = Math.max(r, QUESTIONS[i].gatesRank);
        }
        rank = r;
      }
      const bonus = answers[9] ?? null;
      localStorage.setItem("airank:v2", JSON.stringify({
        name: nameInput.value,
        current,
        answers,
        rank,
        bonus,
      }));
    } catch (e) {}
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

  function isAuthed() {
    const s = readAuth();
    return !!(s && s.name && s.email && s.company);
  }
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
  /* Certificate → JPEG (native Canvas, no external dependency) */
  async function doDownload() {
    try {
      toast("証明書を生成中…");

      // Pull live values from DOM
      const nm      = ($("#certName")?.textContent       || "—— ANONYMOUS ——").trim();
      const num     = ($("#certNumeral")?.textContent    || "—").trim();
      const en      = ($("#certTitleEn")?.textContent    || "UNRANKED").trim();
      const ja      = ($("#certTitleJa")?.textContent    || "未 診 断").trim();
      const def     = ($("#certDefinition")?.textContent || "").trim();
      const serial  = ($("#certSerial")?.textContent     || "0000-0000-0000").trim();
      const dateTxt = ($("#certDate")?.textContent       || "—— / —— / ——").trim();

      // Preload fonts used by the canvas render (page already fetched them)
      const fontSets = [
        'bold 72px "Bricolage Grotesque"',
        '600 40px "Shippori Mincho B1"',
        '400 26px "Shippori Mincho B1"',
        '500 22px "Instrument Sans"',
        '400 18px "JetBrains Mono"',
        '400 14px "JetBrains Mono"',
      ];
      try {
        if (document.fonts?.load) {
          await Promise.all(fontSets.map((f) => document.fonts.load(f)));
        }
      } catch (e) { /* best-effort */ }

      // Canvas (portrait, retina-ish)
      const W = 1400, H = 1960;
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const ctx = c.getContext("2d");

      // Paper background
      ctx.fillStyle = "#F1ECE0";
      ctx.fillRect(0, 0, W, H);

      // Subtle inner-shadow vignette
      const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(23,19,15,0.08)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      // Inner double frame
      const INK = "#17130F", ACCENT = "#8B2514", BRASS = "#B18B4E", INK_SOFT = "#2A241E", INK_MUTED = "#5C5247", INK_GHOST = "#958A7C";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.strokeRect(60, 60, W - 120, H - 120);
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = "rgba(23,19,15,0.35)";
      ctx.strokeRect(75, 75, W - 150, H - 150);

      // Ornamental corners (L-shaped brackets)
      const cornerLen = 42, cornerOff = 88;
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 2;
      const drawCorner = (x, y, dx, dy) => {
        ctx.beginPath();
        ctx.moveTo(x + dx * cornerLen, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + dy * cornerLen);
        ctx.stroke();
      };
      drawCorner(cornerOff, cornerOff, 1, 1);
      drawCorner(W - cornerOff, cornerOff, -1, 1);
      drawCorner(cornerOff, H - cornerOff, 1, -1);
      drawCorner(W - cornerOff, H - cornerOff, -1, -1);

      // Helper: centered text
      const drawCenter = (text, y, font, color, letterSpacing = 0) => {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        if (!letterSpacing) {
          ctx.fillText(text, W / 2, y);
          return;
        }
        // Manual letter-spacing for uppercase / mono styles
        const chars = Array.from(text);
        const widths = chars.map((ch) => ctx.measureText(ch).width);
        const total = widths.reduce((a, b) => a + b, 0) + letterSpacing * (chars.length - 1);
        let x = W / 2 - total / 2;
        chars.forEach((ch, i) => {
          ctx.fillText(ch, x + widths[i] / 2, y);
          x += widths[i] + letterSpacing;
        });
      };

      // Header
      drawCenter("── CERTIFICATE OF THE AI RANK ──", 200,
        '400 22px "JetBrains Mono", monospace', INK, 3);
      drawCenter("認 定 証 / OFFICIAL RECORD", 240,
        '400 18px "JetBrains Mono", monospace', INK_GHOST, 2);

      // Decorative separator
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(W / 2 - 180, 280); ctx.lineTo(W / 2 - 30, 280); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W / 2 + 30, 280); ctx.lineTo(W / 2 + 180, 280); ctx.stroke();
      ctx.fillStyle = BRASS;
      ctx.beginPath(); ctx.arc(W / 2, 280, 4, 0, Math.PI * 2); ctx.fill();

      // "THIS CERTIFIES THAT"
      drawCenter("THIS CERTIFIES THAT", 380,
        '400 20px "JetBrains Mono", monospace', INK_MUTED, 5);

      // NAME (huge, serif)
      drawCenter(nm, 480,
        '600 56px "Shippori Mincho B1", serif', INK, 0);

      // underline under name
      const nameW = Math.min(W - 240, ctx.measureText(nm).width + 160);
      ctx.strokeStyle = "rgba(23,19,15,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo((W - nameW) / 2, 510); ctx.lineTo((W + nameW) / 2, 510); ctx.stroke();

      // "HAS ATTAINED THE RANK OF"
      drawCenter("HAS ATTAINED THE RANK OF", 580,
        '400 20px "JetBrains Mono", monospace', INK_MUTED, 5);

      // Roman numeral (gigantic)
      ctx.font = '700 180px "Bricolage Grotesque", sans-serif';
      ctx.fillStyle = ACCENT;
      ctx.textAlign = "center";
      ctx.fillText(num, W / 2, 780);

      // EN rank name
      drawCenter(en, 870,
        '700 56px "Bricolage Grotesque", sans-serif', INK, 2);

      // JA rank name
      drawCenter(ja, 940,
        '600 32px "Shippori Mincho B1", serif', INK_SOFT, 12);

      // Definition (wrapped)
      {
        ctx.font = '400 22px "Shippori Mincho B1", serif';
        ctx.fillStyle = INK_SOFT;
        ctx.textAlign = "center";
        const maxW = W - 280;
        // naive wrap — insert break every ~28 full-width chars
        const words = def.split("");
        const lines = [];
        let line = "";
        words.forEach((ch) => {
          if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; }
          else { line += ch; }
        });
        if (line) lines.push(line);
        let y = 1020;
        lines.forEach((ln) => { ctx.fillText(ln, W / 2, y); y += 36; });
      }

      // Seal (circles + text)
      const sealX = W / 2, sealY = 1280, sealR = 90;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(sealX, sealY, sealR - 10, 0, Math.PI * 2); ctx.stroke();
      drawCenter("THE · AI · RANK", sealY - 12,
        '400 11px "JetBrains Mono", monospace', INK, 2);
      ctx.font = '700 40px "Bricolage Grotesque", sans-serif';
      ctx.fillStyle = ACCENT;
      ctx.textAlign = "center";
      ctx.fillText("AIR", sealX, sealY + 18);
      drawCenter("· MMXXVI ·", sealY + 40,
        '400 10px "JetBrains Mono", monospace', INK_MUTED, 2);

      // Footer: left (issuer), right (serial / date)
      const footY = 1550;

      // Separator line above footer
      ctx.strokeStyle = "rgba(23,19,15,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(180, footY - 80); ctx.lineTo(W - 180, footY - 80); ctx.stroke();

      // Issuer (left)
      ctx.textAlign = "left";
      ctx.font = '400 14px "JetBrains Mono", monospace';
      ctx.fillStyle = INK_GHOST;
      ctx.fillText("ISSUED BY", 200, footY - 40);
      ctx.font = '700 44px "Bricolage Grotesque", sans-serif';
      ctx.fillStyle = INK;
      ctx.fillText("CHAEN", 200, footY + 10);
      ctx.font = '400 13px "JetBrains Mono", monospace';
      ctx.fillStyle = INK_MUTED;
      ctx.fillText("AI 格付けランク · MMXXVI", 200, footY + 40);

      // Serial / date (right)
      ctx.textAlign = "right";
      ctx.font = '400 14px "JetBrains Mono", monospace';
      ctx.fillStyle = INK_GHOST;
      ctx.fillText("SERIAL №", W - 200, footY - 40);
      ctx.font = '500 28px "JetBrains Mono", monospace';
      ctx.fillStyle = INK;
      ctx.fillText(serial, W - 200, footY);
      ctx.font = '400 14px "JetBrains Mono", monospace';
      ctx.fillStyle = INK_MUTED;
      ctx.fillText(dateTxt, W - 200, footY + 30);

      // Colophon mark bottom
      drawCenter("THE AI RANK · © 2026 CHAEN · NO. 0001", 1840,
        '400 13px "JetBrains Mono", monospace', INK_GHOST, 4);

      // Export → JPEG blob → download
      const blob = await new Promise((resolve, reject) => {
        c.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/jpeg", 0.92);
      });

      // Sanitize filename
      const safeName = nm.replace(/[^A-Za-z0-9\u3040-\u30FF\u4E00-\u9FFF\- ]/g, "").trim().replace(/\s+/g, "-") || "ANONYMOUS";
      const safeEn   = en.replace(/[^A-Za-z0-9\- ]/g, "").trim().replace(/\s+/g, "-") || "RANK";
      const today    = new Date();
      const iso      = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
      const fileName = `THE-AI-RANK_Lv${num}_${safeEn}_${safeName}_${iso}.jpg`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 800);

      toast("証明書を保存しました 🎖️");
    } catch (err) {
      console.error("[AIRANK:cert_download_failed]", err);
      toast("保存に失敗しました。もう一度お試しください。");
    }
  }

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
let __signupModalReleaseFocus = null;
function openModal(intent) {
  const modal = document.getElementById("signupModal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  modal.dataset.intent = intent || "";
  document.body.style.overflow = "hidden";
  __signupModalReleaseFocus = trapFocus(modal);
  // Target the visible name field explicitly — querySelector returns the first
  // DOM match, not the first selector match, and the honeypot input lives above
  // #regName in source order.
  setTimeout(() => {
    const target = modal.querySelector("#regName")
      || modal.querySelector("input:not([tabindex='-1']):not([type='hidden'])")
      || modal.querySelector("button");
    target?.focus();
  }, 80);
}
function closeModal() {
  const modal = document.getElementById("signupModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (__signupModalReleaseFocus) { __signupModalReleaseFocus(); __signupModalReleaseFocus = null; }
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

  // Hydrate from prior registration if exists (expired entries auto-cleared)
  {
    const saved = readAuth() || {};
    if (saved.name && nameI) nameI.value = saved.name;
    if (saved.email && emailI) emailI.value = saved.email;
    if (saved.company && companyI) companyI.value = saved.company;
  }

  async function completeAuth(data) {
    // Strip hp (honeypot) from persisted payload — we only send it to the API
    const { hp, ...rest } = data;

    // Resolve rank: prefer stored value, fall back to computing from answers,
    // then fall back to DOM-rendered certificate numeral (covers older storage shapes).
    const resolveRank = () => {
      try {
        const state = JSON.parse(localStorage.getItem("airank:v2") || "{}");
        if (Number.isFinite(state.rank)) return state.rank;
        const ans = Array.isArray(state.answers) ? state.answers : null;
        if (ans && ans.length >= 9) {
          const QRANK = [1, 2, 3, 4, 5, 6, 7, 8, 9];
          let r = 0;
          for (let i = 0; i < 9; i++) {
            if (ans[i] != null && ans[i] >= 2) r = Math.max(r, QRANK[i]);
          }
          return r;
        }
      } catch (e) {}
      // DOM fallback: read the certificate numeral rendered on screen
      const n = document.getElementById("certNumeral")?.textContent?.trim() || "";
      const ROMAN = { "0":0,"I":1,"II":2,"III":3,"IV":4,"V":5,"VI":6,"VII":7,"VIII":8,"IX":9 };
      if (n in ROMAN) return ROMAN[n];
      return null;
    };

    const payload = {
      ...rest,
      hp,
      at: Date.now(),
      rank: resolveRank(),
      referrer: document.referrer || "",
      url: location.href,
      ua: navigator.userAgent,
    };

    // 1) Submit to backend first — do NOT set auth until the server confirms.
    if (SIGNUP_WEBHOOK) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(SIGNUP_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          mode: "cors",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          if (resp.status === 429) {
            toast("しばらくお待ちください");
          } else if (err.error) {
            toast(err.error);
          } else {
            toast("登録に失敗しました。再度お試しください");
          }
          return false;
        }
      } catch (e) {
        toast(e.name === "AbortError" ? "タイムアウトしました" : "通信エラーが発生しました");
        return false;
      }
    }

    // 2) Persist locally (strip hp/ua/referrer — never touch storage)
    const { hp: _hp, ua: _ua, referrer: _ref, ...persistable } = payload;
    writeAuth(persistable);

    // 3) Proceed with the intended action
    const intent = modal.dataset.intent;
    closeModal();
    toast(`ようこそ · ${data.name || data.email}`);
    setTimeout(() => {
      if (intent === "share-x") window.__airank_share.doShareX();
      else if (intent === "share-li") window.__airank_share.doShareLinkedIn();
      else if (intent === "download") window.__airank_share.doDownload();
    }, 500);
    return true;
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = (nameI?.value || "").trim();
    const email = (emailI?.value || "").trim();
    const company = (companyI?.value || "").trim();
    const hp = (document.getElementById("hp")?.value || "").trim();
    if (!name) { toast("氏名を入力してください"); nameI?.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { toast("有効なメールアドレスを入力してください"); emailI?.focus(); return; }
    if (!company) { toast("会社名を入力してください"); companyI?.focus(); return; }
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      await completeAuth({ name, email, company, hp });
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();

/* ═══════════════════════════════════════════
   5b. ENTERPRISE INQUIRY MODAL
   ═══════════════════════════════════════════ */
(function enterpriseWiring() {
  const modal = document.getElementById("enterpriseModal");
  if (!modal) return;

  let releaseFocus = null;
  function openEnt() {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    releaseFocus = trapFocus(modal);
    setTimeout(() => modal.querySelector("#entCompany")?.focus(), 80);
  }
  function closeEnt() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (releaseFocus) { releaseFocus(); releaseFocus = null; }
  }

  document.getElementById("openEnterpriseForm")?.addEventListener("click", openEnt);
  // Header shortcut: scroll to enterprise section + open form
  document.getElementById("openEnterpriseFromHeader")?.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("enterprise")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(openEnt, 450);
  });
  modal.addEventListener("click", (e) => { if (e.target.closest("[data-close-ent]")) closeEnt(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("open")) closeEnt(); });

  const form = document.getElementById("enterpriseForm");
  const $$ = (id) => document.getElementById(id);

  function resetSubmitBtn(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = '<span>送信する</span><span class="mono">→</span>';
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const company = ($$("entCompany")?.value || "").trim();
    const contact_name = ($$("entContactName")?.value || "").trim();
    const job_title = ($$("entJobTitle")?.value || "").trim();
    const email = ($$("entEmail")?.value || "").trim();
    const employee_count = $$("entEmployeeCount")?.value || "";
    const message = ($$("entMessage")?.value || "").trim();
    const hp = ($$("entHp")?.value || "").trim();
    const interests = Array.from(
      form.querySelectorAll('input[name="entInterest"]:checked')
    ).map((el) => el.value);
    const consultation_pref = (form.querySelector('input[name="entConsultPref"]:checked') || {}).value || null;

    if (!company) { toast("会社名を入力してください"); $$("entCompany")?.focus(); return; }
    if (!contact_name) { toast("担当者名を入力してください"); $$("entContactName")?.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { toast("有効なメールアドレスを入力してください"); $$("entEmail")?.focus(); return; }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "送信中..."; }

    const payload = {
      company, contact_name, email,
      job_title: job_title || null,
      employee_count: employee_count || null,
      interests,
      consultation_pref,
      message: message || null,
      hp,
      at: Date.now(),
      url: location.href,
      referrer: document.referrer || "",
      ua: navigator.userAgent,
    };

    try {
      const resp = await fetch("/api/enterprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        toast(data.error === "Too many requests" ? "しばらくお待ちください" : "送信に失敗しました。再度お試しください");
        resetSubmitBtn(submitBtn);
        return;
      }
      closeEnt();
      toast("お問い合わせを受け付けました。内容を拝見のうえ、順次ご返信いたします。");
      form.reset();
      resetSubmitBtn(submitBtn);
    } catch (err) {
      toast("通信エラーが発生しました");
      resetSubmitBtn(submitBtn);
    }
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
