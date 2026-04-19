# THE AI RANK 🎖️

> **A 9-level global standard for measuring an individual's AI literacy.**
>
> How far has your AI mastery actually come?

🌐 **Live:** [ai-rank.org](https://ai-rank.org) — take the 2-minute diagnostic (free)
🇯🇵 **日本語README:** [README.ja.md](./README.ja.md)

![THE AI RANK OG Image](./og-image.png)

![License](https://img.shields.io/badge/license-MIT-8B2514)
![Status](https://img.shields.io/badge/status-live-brightgreen)
![Edition](https://img.shields.io/badge/edition-MMXXVI·I-C9A14A)

---

## What is THE AI RANK?

In 2026, AI has passed the "can you use it" phase. The real differentiator is **how far you actually use it** — and the gap between casual ChatGPT users and engineers running autonomous agent fleets has grown 10× or more.

**THE AI RANK** proposes a **common language** for this gap: nine clearly defined levels, from Beginner to Singularian. You take a 10-question diagnostic and receive a personalized certificate with your level.

This repository is an **open, community-driven project** hosted as a single-creator initiative by **[CHAEN](https://x.com/masahirochaen)**.
The goal: grow it into the **strongest universal AI literacy standard**, with input from contributors around the world.

---

## The 9 Levels

From bottom to top:

| Lv. | Title | In one line |
|:---:|:---|:---|
| **I**    | **THE BEGINNER**       | Uses free AI as a search-engine replacement |
| **II**   | **THE POWER USER**     | Subscribes to paid plans + mixes specialist AIs |
| **III**  | **THE BOT BUILDER**    | Bakes own workflow into GPTs / Gems / Projects |
| **IV**   | **THE ARTIFACTOR**     | Ships shareable mini-apps (Claude Artifacts / Lovable / v0) ★ **First goal for non-engineers** |
| **V**    | **THE VIBE CODER**     | Builds internal tools & small external apps in natural language |
| **VI**   | **THE AUTOMATOR**      | Runs 24/7 automated workflows, in-house and for clients ★ **Realistic ceiling for non-engineers** |
| **VII**  | **THE AGENT MASTER**   | Delegates business-scale tasks to agent fleets |
| **VIII** | **THE AI ALCHEMIST**   | Converts AI into actual revenue — live SaaS or core system ★ **Commercial summit** |
| **IX**   | **THE SINGULARIAN**    | AI runs the company itself, including revenue |

Full descriptions, representative tools, and graduation criteria are at [ai-rank.org](https://ai-rank.org).

---

## Design Philosophy

### Why rank at all?

- "I use ChatGPT" no longer conveys the 10× skill gap that actually exists
- Hiring, self-assessment, corporate training all need a **common yardstick**
- Theory isn't enough — the levels must reflect **the 2026 tool stack** (Claude Code / Artifacts / Manus / Lovable / Dify Auto / OpenClaw, etc.)

### Why "universal"?

AI literacy transcends borders. This repo targets a **shared cross-country language** for AI mastery — usable by HR teams in Tokyo, engineers in SF, and students in Berlin alike.

### The four canons

1. **Execution ＞ Knowledge** — "I've heard of it" doesn't count; "I run it weekly" does
2. **Publishing ＞ Private use** — If nobody else can use what you built, drop one rank
3. **Continuous operation ＞ One-shot** — Systems that run 24/7 outrank projects that don't
4. **Contribution ＞ Self-productivity** — Lifting others' productivity outranks lifting only your own

---

## 🤝 Contribute — help build the world standard

This project is **meant to be built together**. We welcome:

- 💡 **Level criteria proposals** — should the bar for Lv.V be higher/lower? Discuss in Issues
- ➕ **New level suggestions** — as AI evolves, new stages will emerge (Lv.X anyone?)
- 🌍 **Translations** — English / Chinese / Korean / Spanish / French / etc.
- ❓ **Better diagnostic questions** — propose question changes to raise judging accuracy
- 🎨 **UI / UX improvements** — PRs welcome on `index.html` / `style.css` / `script.js`
- 📚 **Real-world case examples** — what does a Lv.VII person actually do all day?

### How to contribute

1. **Open an Issue** — bugs, proposals, questions — first discussion goes here
2. **Pull Requests** — code improvements, typo fixes, new features
3. **GitHub Discussions** — philosophical & design-level debates

All contributors are listed on the [Contributors page](https://github.com/chaenmasahiro0425/the-ai-rank/graphs/contributors).

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## 🧰 Tech Stack

Minimal by design — a static landing page plus a handful of Vercel serverless functions.

```
the-ai-rank/
├── index.html           # Main page (JP primary, JP/EN toggle via i18n.js)
├── style.css            # Design system (Bricolage Grotesque / Instrument Sans / Shippori Mincho B1)
├── script.js            # Quiz logic, certificate, modal
├── i18n.js              # JP / EN translation dictionary & runtime swap
├── og-image.png         # Default OG / Twitter card (1200×630)
├── og-preview.html      # Source HTML rendered to og-image.png via Playwright
├── og-cert-template.html # Template for per-rank certificate OG images
├── og/rank-0.png … 9.png # Rank-specific certificate OG images
├── favicon.svg
├── api/
│   ├── signup.js        # Sign-up data endpoint (writes to Vercel logs + optional forward)
│   └── cert.js          # Shareable certificate URL with rank-specific OG tags
├── vercel.json          # Headers, rewrites, cache policy
├── README.md            # English (this file)
├── README.ja.md         # Japanese
├── CONTRIBUTING.md
├── POSTS.md             # Drafts for X / blog announcements
├── DATA_STORAGE.md      # How sign-up data is stored & how to wire real persistence
└── DNS_SETUP.md         # DNS setup notes for custom domains
```

### Run locally

```bash
git clone https://github.com/chaenmasahiro0425/the-ai-rank.git
cd the-ai-rank
python3 -m http.server 4173
# open http://localhost:4173
```

### Deploy to Vercel

```bash
vercel --prod
```

---

## 📊 How the quiz works

- 10 multiple-choice questions (4 options each)
- Clicking an answer auto-advances after 350 ms — no manual "Next" needed
- Q1–Q9 gate Lv.I–Lv.IX
- Q10 is a bonus (industry contribution badge)
- Rank = highest level where the answer scored ≥ 2 (option C or D)
- Result = certificate with name, rank, English & Japanese labels, description, serial #, issue date

The certificate renders inline as an interactive card **and** as a shareable OG image with a unique URL per rank (`/c?rank=N&name=X`). Posting that URL to X/Twitter shows the rank-specific certificate preview.

---

## 🔐 Privacy

- Diagnostic answers live only in the user's browser (`localStorage`)
- Sign-up is required **only for sharing / PNG export** — collects name, email, company
- No tracking cookies, no third-party analytics (by default)
- See [DATA_STORAGE.md](./DATA_STORAGE.md) for persistence options and plumbing

---

## 🏢 Enterprise edition (coming soon — paid)

For organizations that want to measure their team's AI maturity:

- Company-wide diagnostics across all employees
- Department benchmarks & trend tracking
- Custom question sets matching your stack
- Quarterly / annual re-testing for growth measurement
- Role-specific training programs
- Executive summary reports

Reach out via **[DM on X → @masahirochaen](https://x.com/masahirochaen)** to join the wait-list.

---

## 🪪 License

**MIT** — copy, modify, commercial use are all free.
"THE AI RANK" is being trademark-registered to avoid brand confusion; please use a different name if you derive a separate ranking system.

---

## 📣 Links

- 🌐 **Website:** https://ai-rank.org
- 🐦 **X (Twitter):** [@masahirochaen](https://x.com/masahirochaen)
- 👤 **Creator:** CHAEN — individual project

---

## 🙏 Acknowledgements

Built from scratch in 2026, informed by decades of prior thinking about skill evaluation, creator classifications, and AI literacy frameworks. Every level was field-tested against the 2026 tool landscape.

---

*Let's build the universal AI literacy standard together.*

— **[CHAEN](https://x.com/masahirochaen)** · MMXXVI
