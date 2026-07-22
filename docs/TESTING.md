# Testing

Base Radar's testing foundation, added in PR-004. This is a foundation, not a coverage target — see [`docs/REPOSITORY_AUDIT_V1.1.md`](REPOSITORY_AUDIT_V1.1.md) and [`docs/ENGINEERING_EXECUTION_PLAN_V1.md`](ENGINEERING_EXECUTION_PLAN_V1.md) for why this exists and what comes after it.

## Running tests

```bash
npm run test        # run once (CI-friendly)
npm run test:watch  # watch mode, for local development
```

## Stack

[Vitest](https://vitest.dev) + [React Testing Library](https://testing-library.com/react) + `jsdom`, using the SWC React transform (`@vitejs/plugin-react-swc`, not the Babel-based `@vitejs/plugin-react`, which conflicts with `shadcn`'s own Babel dependency chain — SWC also matches the toolchain Next.js itself already uses). Configuration lives in `vitest.config.ts`, entirely separate from the app's own Next.js build.

## Folder structure

Tests live under `tests/`, mirroring the structure of `lib/` and `components/` — never colocated next to the production file they test:

```
tests/
  setup.ts                          # jest-dom matchers + RTL cleanup, loaded before every test
  lib/
    intelligence/
      scoring.test.ts
      confidence.test.ts
    utils.test.ts
  components/
    ui/
      EmptyState.test.tsx
    watchlists/
      WatchButton.test.tsx
```

A test's path should always tell you which production file it covers: `tests/lib/intelligence/scoring.test.ts` tests `lib/intelligence/scoring.ts`.

## Naming convention

`<name>.test.ts` for pure logic, `<name>.test.tsx` for anything that renders. One test file per production module — don't bundle unrelated modules into one file as the suite grows.

## What's tested today

Deliberately small: a demonstration of the pattern, not full coverage.

- **`lib/intelligence/scoring.ts`, `lib/intelligence/confidence.ts`** — the two pure, deterministic scoring functions the repository audit flagged as the platform's highest-trust-sensitive, previously-untested logic.
- **`lib/utils.ts`** — small, widely-shared pure utilities (`cn`, `splitOverflow`, `sortAlphabetically`).
- **`components/ui/EmptyState.tsx`** — a simple, reusable, predictable-output component (rendering + accessibility).
- **`components/watchlists/WatchButton.tsx`** — a small, interactive, reusable component (rendering + click interaction + `aria-pressed`/`aria-label` correctness), with its `useWatchlist` dependency mocked to isolate it from real storage.

## When to add a new test

- **Always** for new pure functions in `lib/` that compute a score, classification, or other deterministic output from inputs — this is where a regression is both easiest to introduce and hardest to notice by eye.
- **Usually** for a new shared, reusable component in `components/ui/` or a component-library-style folder, especially anything with real interaction or accessibility attributes.
- **Not required** for styling, animation/Framer Motion, icon choices, layout, or one-off page-level composition — these are better caught by the live browser QA pass every PR already does, not a unit test.
- **Not required** to hit a coverage percentage. A test that exists only to move a coverage number, without covering a real behavior someone could plausibly break, isn't worth maintaining.

## Fixtures for large data types

Several production types (`Project`, `ProjectSources`, and friends) are large, shared data shapes with many fields a given function never reads. Test fixtures for these deliberately supply only the fields the function under test actually touches, using `as unknown as TheType` to satisfy TypeScript — this is a fixture being intentionally narrower than the real type, not a gap in the production types themselves. See `tests/lib/intelligence/scoring.test.ts` for the pattern.
