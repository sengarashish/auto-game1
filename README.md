# 🎮 Quiz Quest — Learning Adventure

A fun, gamified educational quiz game for **kids in PK–8** (US curriculum), built with
**[Phaser 4](https://phaser.io)**. Kids pick a subject, topic, number of questions, and
difficulty, then play an auto-graded quiz packed with sounds, visuals, characters, and rewards.

## ✨ Features

- **Math** — procedurally generated questions (counting, addition, subtraction, multiplication,
  division, comparison, fractions, money, telling time, shapes, word problems) with **automatic
  grading**.
- **Reading / Alphabet (ELA)** — letter recognition, uppercase↔lowercase, alphabet sequencing,
  beginning sounds, rhyming, and sight words. Generated + dataset-backed, also auto-graded.
- **Curriculum-aligned** — organized by grade bands (PK–K, 1–2, 3–5, 6–8) and tagged with both
  **Common Core (CCSS)** and **Florida B.E.S.T.** standards.
- **Build-your-quiz wizard** — clean step-by-step flow (subject & grade → **pick one or more
  topics** → difficulty & length → theme), so nothing is squeezed and the Start button never
  overlaps content.
- **Gamified UX** — mascot characters you can tap, **answer streaks**, animated/bobbing answer
  choices, star meter, badges, and **randomized celebration effects** (no two correct answers feel
  the same).
- **Selectable themes with live animated previews** — Space, Ocean, Jungle, Candy — each with its
  own mascot, ambient particle animation (twinkles, bubbles, falling leaves, candy), and
  tap-to-sparkle interactivity. Tapping a theme changes the whole scene instantly.
- **Audio + visuals** — spoken prompts/letter sounds (Web Speech API, auto-selects the best
  natural OS voice) and varied, synthesized sound effects + particle bursts.
- **Local kid profiles** — multiple kids, each with an avatar and saved progress (no accounts,
  no personal data — COPPA-friendly).
- **Accessible** — large touch targets, colorblind-safe feedback, dyslexia-friendly font option,
  reduced-motion toggle, "Read to me" mode, keyboard + touch support.

## 🚀 Getting started

```bash
npm install
npm run dev      # open the printed localhost URL
```

### Other commands

```bash
npm run build    # type-check + production build → dist/
npm run preview  # serve the production build
npm run test     # run unit tests (generators + grading)
npm run lint
```

## 🧩 How it works

Questions come from **pure generator functions** (`src/quiz/generators/`) that always emit the
correct answer, so grading is automatic and reliable. ELA word data lives in bundled JSON
(`src/data/content/`) read through a `DataSource` abstraction — making a future SQLite/REST
backend a drop-in swap. See [CLAUDE.md](./CLAUDE.md) for the full architecture and a guide to
adding new topics.

## 🔊 A note on the voice (Web Speech vs. Piper)

Narration uses the browser's built-in **Web Speech API**, which plays the operating system's
voices. We auto-rank and pick the highest-quality one available (Apple's "Samantha", Windows
"Natural"/Edge neural voices, Chrome's "Google US English", etc.). This is the best quality you can
get with **zero download** and it works offline.

A neural TTS like **Piper** can run in the browser via WebAssembly, but each voice model is a
~20–60 MB download — not "small," and it adds startup latency and bundle complexity. For a kids'
game where instant, offline playback matters, Web Speech is the better default. If you later want
Piper-grade voices, the swap point is `src/audio/AudioManager.ts` (`speak()`); drop in a
WASM/ONNX TTS there behind a setting and the rest of the app is unchanged.

## 📦 Deploying (free, no hosting bill)

This is a fully static app, so **GitHub Pages hosts it for free**. A workflow
(`.github/workflows/deploy.yml`) builds and publishes automatically on push to `main`:

1. Push this repo to GitHub.
2. In **Settings → Pages**, set **Source = GitHub Actions**.
3. Set `BASE_PATH` in the workflow to `/<your-repo-name>/` (already `/auto-game1/`).
4. Push to `main` — the site deploys to `https://<you>.github.io/<repo>/`.

(Netlify, Cloudflare Pages, and Vercel also work the same way for free — just `npm run build` and
serve `dist/`.)

## 📁 Project layout

```
src/
  scenes/      Boot → Preload → Profile → Menu → Quiz → Results
  quiz/        types, QuizEngine, QuestionFactory, generators/
  data/        catalog (subjects/topics/standards), dataSource, content/*.json
  profiles/    localStorage profiles, stars, badges
  audio/       SFX + speech narration
  ui/          reusable buttons, mascot, progress bar, effects
  config/      game config + themes
  utils/       seedable RNG, shuffle, helpers
```

## 📝 License

MIT
