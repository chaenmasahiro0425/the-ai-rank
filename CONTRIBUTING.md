# Contributing to THE AI RANK

Thanks for your interest in contributing! This is an open, community-driven project and we welcome all kinds of help — from typo fixes to re-thinking entire levels.

---

## 💬 Before you start

The best first step is almost always **to open an issue** and discuss.

- For **level definitions / criteria**: we want debate. Open an Issue tagged `discussion` with your reasoning.
- For **code / UX**: open an Issue or jump straight to a PR if the change is small (< 50 lines).
- For **translations**: see the dedicated section below.

---

## 🌍 Translations

Currently the LP supports **JP / EN** via a runtime dictionary in `i18n.js`.

To add a new language (e.g., Chinese, Korean, Spanish):

1. Add a new top-level object in `I18N`:
   ```js
   const I18N = {
     ja: { ... },
     en: { ... },
     zh: {
       "masthead.brand": "...",
       "hero.kicker1": "...",
       // ...
     },
   };
   ```
2. Add a button to the lang-switcher in `index.html`:
   ```html
   <button type="button" class="lang-btn" data-lang="zh" aria-pressed="false">中</button>
   ```
3. Submit a PR titled `i18n: add <language>`

Keep translations **concise** — they go in tight typographic slots.

---

## 🎨 Design / UX PRs

**Design constraints:**

- **Fonts:** Bricolage Grotesque (display) / Instrument Sans (body) / Shippori Mincho B1 (Japanese) / JetBrains Mono (meta). Please don't introduce new font families without discussion.
- **Color palette:** bone paper `#F1ECE0`, warm ink `#17130F`, oxblood `#8B2514`, aged brass `#C9A14A`. Keep the editorial-archive aesthetic.
- **Motion:** all animations use `cubic-bezier(0.2, 0.8, 0.2, 1)` or `(0.16, 1, 0.3, 1)`. Keep reveal timing 300–600ms.
- **No generic AI-vibe gradients** (purple on white, etc.)

**Before submitting:**

1. Test at **390 × 844** (mobile) and **1280 × 900** (desktop)
2. Run through the full diagnostic flow to confirm no layout shift
3. Verify both JP and EN render correctly
4. Keep bundle size under control — no heavy libs

---

## 🧪 Quiz / Level criteria changes

Level definitions are the **heart** of the project. Changes require:

1. **Rationale** — why is the current criterion wrong or incomplete?
2. **Real-world example** — who would be affected? What does their work look like?
3. **Consistency check** — does the change preserve the "10× gap between adjacent levels" principle?
4. **Graduation condition** — updated specific, measurable condition for reaching the level

Discuss in an Issue first. Not all proposals will be accepted, but all will get a thoughtful reply.

---

## 🔒 Security

If you find a security issue, please **DO NOT** open a public issue. DM via X ([@masahirochaen](https://x.com/masahirochaen)) instead.

---

## 📜 Code style

- JavaScript: ES2022+, no framework, no build step
- No `innerHTML` with user input (use `textContent` or safe builders)
- No external script dependencies unless discussed
- CSS: follow the existing design tokens in `:root {...}` at the top of `style.css`

---

## 🙏 Attribution

All contributors are listed automatically on the [Contributors page](https://github.com/chaenmasahiro0425/the-ai-rank/graphs/contributors). Significant contributions may also be credited in the LP footer and release notes.

---

## Code of Conduct

Be kind, be curious, be precise. Debate the idea, not the person. AI literacy is a global issue — assume good faith.

---

Thanks again. Let's build the universal AI literacy standard together. 🎖️

— CHAEN & contributors
