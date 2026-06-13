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
- **Gamified UX** — mascot characters, star meter, badges, encouraging feedback, confetti.
- **Selectable themes** — Space, Ocean, Jungle, Candy.
- **Audio + visuals** — spoken prompts/letter sounds (Web Speech API) and sound effects.
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

## 📦 Deploying

This is a fully static app. A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and
publishes to GitHub Pages. After adding your remote, set the repo name as `BASE_PATH` in that
workflow (e.g. `/auto-game1/`).

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
