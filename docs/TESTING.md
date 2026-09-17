# Testing

Base Radar's testing foundation, added in PR-004. This is a foundation, not a coverage target — see [`docs/archive/REPOSITORY_AUDIT_V1.1.md`](archive/REPOSITORY_AUDIT_V1.1.md) and [`docs/ENGINEERING_EXECUTION_PLAN_V1.md`](ENGINEERING_EXECUTION_PLAN_V1.md) for why this exists and what comes after it.

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

## E2E and visual regression (PR-097.04)

The suite above is Vitest + jsdom — no real browser, no real server. `e2e/` adds the first layer that drives one: [Playwright](https://playwright.dev), chosen because no browser E2E framework existed yet and the project's own architecture (a standard Next.js server, real HTTP API routes) supports it directly, with no new testing philosophy — real requests against a real, locally-running production build, the same "real, not mocked" preference the rest of this app's own testing already follows (see `tests/app/api/auth/verify/route.test.ts`'s own real-signature SIWE tests, which `e2e/fixtures/auth.ts` reuses the shape of).

### Running it

```bash
npm run test:e2e                      # full suite: smoke + visual regression
npm run test:e2e:update-snapshots      # regenerate visual regression baselines after an intentional UI change
npx playwright test e2e/auth.spec.ts   # a single spec file
npx playwright show-report             # view the last run's HTML report
```

`playwright.config.ts`'s `webServer` builds and starts the app itself (`next build`, then the same `public/`/`.next/static` copy steps `Dockerfile` performs, then `node .next/standalone/server.js` — matching this app's real `output: "standalone"` deployment, not `next start`, which Next.js itself warns is incompatible with that config) on `localhost:3100`, against a dedicated `.data/e2e.db` (separate from the local dev database) with `ADMIN_WALLET_ADDRESSES` set to `e2e/fixtures/auth.ts`'s one fixed test wallet. Locally it reuses an already-running server on that port; CI always starts fresh. Workers are capped at 2 (CI: 1) — confirmed live that the default per-core worker count sent enough concurrent requests to the real, provider-fetching `/dashboard/projects/[slug]` route to occasionally exceed the suite's own 30s test timeout under contention, even though every affected test passed individually.

### Folder structure

```
e2e/
  fixtures/
    auth.ts       # real SIWE sign-in/sign-out over HTTP — see its own doc comment
    splash.ts      # waits out the real first-load SplashScreen animation
  auth.spec.ts
  dashboard.spec.ts
  profile.spec.ts
  project-profile.spec.ts
  visual/
    dashboard.visual.spec.ts
    profile.visual.spec.ts
    topbar.visual.spec.ts
    *-snapshots/    # baseline images — tracked in git, diffed against on every run
```

Kept separate from `tests/` (a different directory, not just a different extension) so Vitest's own `include` glob never picks these up, and so "unit/component test" and "real browser against a real server" stay two clearly distinct things.

### Authentication in E2E

Every SIWE sign-in uses `e2e/fixtures/auth.ts`'s `signIn()` — a real challenge, a real signature (via `viem/accounts`, no browser wallet extension needed, the same shortcut `tests/app/api/auth/verify/route.test.ts` already takes), and a real verify call, sent with `page.request` specifically (not the bare `request` fixture — confirmed live they're separate `APIRequestContext`s with separate cookie jars in this Playwright version, so a session set via the bare fixture is invisible to `page.goto()` afterward). It also sends a real (if default-valued) `guestSnapshot`, matching what a genuine first-time browser visitor's `collectGuestSnapshot()` always sends — omitting it was tried first and confirmed to under-simulate a real sign-in (no `account` sync operation ever gets logged for a snapshot-less sign-in, so the local `isGuest` flag never gets corrected — a real, narrow gap in Bug 3's fix for a scenario Bug 3's own manual testing never hit, since it always reused wallets with pre-existing synced state).

`ADMIN_TEST_WALLET` is one fixed key generated solely for this suite (no real value on any real chain); every other flow uses `randomTestWallet()` — a fresh key per test, guaranteed not to match the admin allowlist.

### Visual regression and determinism

Real, live market/ecosystem data (gas, prices, block height, AI-generated recommendation lists) makes a naive full-page screenshot inherently flaky. Confirmed through several iterations while building this suite:

- `framer-motion`'s `SplashScreen` (a real, up-to-400ms fade on every fresh browser context) can still be mid-animation when a screenshot fires — Playwright's own animation-freezing only affects CSS animations, not `framer-motion`'s inline-style/rAF-driven ones. `e2e/fixtures/splash.ts`'s `waitForSplashGone()` waits for its real DOM element to detach.
- Masking a volatile region's *content* (`toHaveScreenshot`'s `mask` option) is not enough on its own when that region's real *height* also varies (a longer highlights list, a different number of recommendation cards) — a mask paints over pixels, it doesn't reserve layout space, so anything below a variable-height card still visibly reflows between runs even with the card's own text hidden.
- `dashboard.visual.spec.ts` resolved this by clipping to the genuinely invariant region only (Sidebar, Topbar with its ticker masked, and the static greeting) rather than fighting variable-height cards below it — a deliberate, documented scope decision, not a forced full-page baseline. `profile.visual.spec.ts` and `topbar.visual.spec.ts` don't need this — a freshly-signed-in test account's Profile page and an open account menu have no material live-data variance of their own.

Regenerate baselines with `npm run test:e2e:update-snapshots` after a real, intentional UI change — review the diff like any other change before committing new snapshot images.

### What's covered today

Deliberately a focused smoke + regression suite for this session's own critical flows, not exhaustive coverage: real User Login / Admin Login / Sign Out (the flow Bug 3 fixed), the Dashboard's real Topbar controls (Watchlist selector, Compare) and responsive layout, the Profile page's real Identity form and Sign Out, and a real Project Profile route (including the real category-rank data C2's performance fix targets, and the real not-found behavior for an invalid slug). Visual regression baselines exist for Dashboard (desktop/tablet/mobile), Profile (desktop/mobile), and the Topbar account menu.
