# CLAUDE.md — Project Guide

This file orients any developer (human or AI) working in this repo. Read it before making changes.

## What this is

**Quiz Quest** is a gamified educational quiz game for **US students PK–8**, built with
**Phaser 4**. Kids (or a parent/teacher) pick a **subject → topic → number of questions →
difficulty → theme**, then play an auto-graded quiz with audio + visual feedback, a mascot
character, stars, and badges.

Two content domains:

- **Math** — questions are generated **procedurally**, so the correct answer is always known →
  **fully auto-graded**.
- **Reading / Alphabet (ELA)** — a mix of **procedural generators** (letter recognition,
  sequencing, beginning sounds, etc.) **plus a bundled JSON dataset** (sight words, phonics,
  rhymes). Every ELA question still ships with its correct answer, so it is auto-graded too.

## Tech stack

- **Phaser 4.1.x** (`phaser`) — game framework.
- **TypeScript 5** + **Vite 5** — build/dev. `npm run dev` for HMR.
- **Vitest** — unit tests for generators and grading (the logic that must be correct).
- **No backend.** 100% client-side, deployable as static files (GitHub Pages workflow included).
- **Audio:** Web Speech API (`speechSynthesis`) for narration / letter sounds (no per-word audio
  files), plus a few short SFX clips for correct/wrong/win/click.

## Scripts

| Command            | What it does                                   |
| ------------------ | ---------------------------------------------- |
| `npm run dev`      | Start Vite dev server (HMR)                    |
| `npm run build`    | Type-check + production build to `dist/`       |
| `npm run preview`  | Serve the production build locally             |
| `npm run test`     | Run Vitest unit tests once                     |
| `npm run lint`     | ESLint over `src/`                             |
| `npm run format`   | Prettier write                                 |

## Architecture (data flow)

```
ProfileScene → MenuScene → QuizScene → ResultsScene
   (who)       (what)       (play)       (reward)
                  │
                  ▼
            QuizConfig  ──►  QuizEngine.build()
                                  │ asks QuestionFactory for N questions
                                  ▼
                      QuestionFactory(topicId)
                         ├─ math generator  (pure fn, seedable RNG)
                         └─ ela generator   (pure fn + DataSource lookup)
                                  │
                                  ▼
                          Question[] (each has the correct answer)
```

- **`src/quiz/types.ts`** — the single `Question` shape every topic conforms to, plus
  `QuizConfig`, `Subject`, `Topic`, `GradeBand`, `Standard`. Keep this the source of truth.
- **`src/quiz/QuizEngine.ts`** — builds the question set, tracks answers, computes score/stars.
- **`src/quiz/QuestionFactory.ts`** — maps a `topicId` to its generator.
- **`src/quiz/generators/`** — one pure function per question type. **Generators must not touch
  Phaser or the DOM** — they return plain `Question` objects so they are unit-testable.
- **`src/data/dataSource.ts`** — `DataSource` interface + `JsonDataSource` (reads bundled JSON).
  This is the **swap point** if you ever add a real SQLite/REST backend (see below).
- **`src/data/catalog.ts`** — the menu: subjects, topics, grade bands, and standard tags.
- **`src/profiles/ProfileStore.ts`** — `localStorage` CRUD for kid profiles, stars, badges.
- **`src/audio/AudioManager.ts`** — SFX + narration.
- **`src/scenes/`**, **`src/ui/`** — Phaser scenes and reusable display objects.

## How to add a new question topic

1. **Write the generator** in `src/quiz/generators/math|ela/<name>.ts` as a pure function:
   `(opts: GenOpts, rng: Rng) => Question`. Use the seedable `rng` (from `src/utils/rng.ts`) so
   output is reproducible/testable. Build 2–4 `choices`, set `answerId` to the correct one.
2. **Register it** in `src/quiz/QuestionFactory.ts` under its `topicId`.
3. **Add it to the catalog** in `src/data/catalog.ts` with `gradeBands`, `ccss`, and `flBest` tags.
4. **Add a unit test** in `src/quiz/generators/.../<name>.test.ts` asserting the marked answer is
   actually correct across many seeds.

ELA topics that need word data: add entries to `src/data/content/*.json` and read them via the
`DataSource` passed into the generator — do not `import` the JSON directly inside generators.

## Content JSON schema (ELA datasets)

`src/data/content/sightWords.json`, `phonics.json`, `wordLists.json` are keyed by **grade band**
(`pk-k`, `1-2`, `3-5`, `6-8`). See each file's top-level comment-shape. The `DataSource` is the
only thing that reads these, so the schema is centralized.

## Standards tagging convention

Every topic in `catalog.ts` carries two arrays:

- `ccss: string[]` — Common Core codes, e.g. `"CCSS.MATH.1.OA.C.6"`.
- `flBest: string[]` — Florida B.E.S.T. codes, e.g. `"MA.1.AR.2.2"`.

These are surfaced in a parent/teacher info popover, not shown to kids. When adding topics, fill
both where applicable (leave `[]` if none).

## Swapping in a real backend later (SQLite/REST)

The app is client-only by design, but content access is abstracted. To add a server:

1. Implement `ApiDataSource` against the `DataSource` interface in `src/data/dataSource.ts`.
2. Point `getDataSource()` at it (env-flagged). Nothing else changes — generators and scenes only
   depend on the interface.

## Conventions & constraints

- **COPPA / privacy:** collect **no PII**. Profiles are first-name + avatar only, stored locally.
  No analytics that identify children, no network calls with personal data.
- **Accessibility:** large touch targets (kids/tablets), feedback never relies on color alone
  (pair with an icon), optional dyslexia-friendly font, reduced-motion toggle, narration for
  pre-readers, full keyboard + tap support.
- **Generators are pure** (no Phaser/DOM) → keep them testable.
- **Difficulty** is `1 | 2 | 3` (easy/medium/hard) and scales number ranges / distractors.
- Code style: Prettier + ESLint configs in repo. 2-space indent, single quotes, semicolons.

## Deploy

`.github/workflows/deploy.yml` builds with `BASE_PATH=/<repo>/` and publishes `dist/` to GitHub
Pages. Remote is added later by the maintainer; set the repo name in the workflow's `BASE_PATH`.
