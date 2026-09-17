import { defineConfig, devices } from "@playwright/test";

/**
 * PR-097.04 (Testing) — the app's first browser E2E/visual-regression
 * layer, deliberately separate from `vitest.config.ts` (unit/component
 * tests under `tests/`, jsdom-based, no real browser or server). This
 * drives a real Chromium against a real, locally-running production
 * build — no HMR/compile flakiness to fight — exercising real HTTP
 * requests against real API routes and a real (test-only) SQLite
 * database.
 *
 * `webServer.command` runs the exact same artifact this app's own
 * `Dockerfile` actually ships (`output: "standalone"` in
 * `next.config.ts`): `next build`, then the same `public/`/`.next/static`
 * copy steps the Dockerfile's `runner` stage performs, then
 * `node .next/standalone/server.js` — not `next start`, which Next.js
 * itself warns is incompatible with `output: "standalone"` (confirmed
 * live: `next start` still happened to serve pages, but with that
 * explicit warning surfaced every run). This way the suite exercises the
 * real production entry point, not a close-but-not-quite stand-in.
 *
 * `webServer` starts that server once per run and reuses it locally
 * (`reuseExistingServer: !CI`) so repeated local runs don't pay the full
 * `next build` cost every time; CI always starts fresh. `SQLITE_DB_PATH`
 * points at a dedicated `.data/e2e.db` — separate from the real local dev
 * database — and `ADMIN_WALLET_ADDRESSES` is set to the one fixed test
 * wallet `e2e/fixtures/auth.ts` uses for the admin-only flows (a
 * throwaway key with no real value, generated solely for this suite —
 * see that file's own doc comment).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Confirmed live: the default (one worker per CPU core) sent enough
  // concurrent requests to `/dashboard/projects/[slug]` — a genuinely
  // expensive route, fanning out to real CoinGecko/DefiLlama/GitHub/
  // Blockscout/Snapshot calls for the whole registry — to push it past
  // this config's own 30s test timeout under full-suite contention, even
  // though every affected test passed individually and with `--workers=1`.
  // Capped rather than left unbounded so a full local run is
  // deterministic without needing a special invocation to avoid flakiness.
  workers: process.env.CI ? 1 : 2,
  reporter: [["html", { open: "never" }]],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      // Real, live market/network data (gas, ETH price, block height,
      // relative timestamps) makes pixel-perfect diffing inherently noisy
      // — each spec masks the specific volatile regions it knows about
      // (see `e2e/visual/*.spec.ts`), and this small global tolerance
      // absorbs anti-aliasing/font-hinting jitter on top of that, not a
      // substitute for masking.
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command:
      "npm run build && " +
      "rm -rf .next/standalone/public .next/standalone/.next/static && " +
      "cp -r public .next/standalone/public && " +
      "cp -r .next/static .next/standalone/.next/static && " +
      "PORT=3100 node .next/standalone/server.js",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      SQLITE_DB_PATH: ".data/e2e.db",
      ADMIN_WALLET_ADDRESSES: "0xC9FE864113B2dA9a744d0B2463564fd72A5987e1",
    },
  },
});
