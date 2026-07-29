# PR-066 QA Test Plan

Scope: end-to-end QA, UAT, regression, and Beta Readiness validation of the existing Base Radar application. This is **not** a feature PR — no new functionality, no redesign, no architecture changes. Only functional bugs, broken UI, runtime errors, accessibility defects, responsive defects, or missing loading/error states discovered during this pass are in scope for fixes.

## Test environment

- Local dev server (`next dev`, Turbopack), Node/npm as configured in `package.json`.
- Browser coverage: **Chromium only**, via the in-app Browser pane. Firefox and Safari were not available in this environment — see `KNOWN_ISSUES.md` for how this gap is handled.
- Viewports tested: desktop (1280×800 default), mobile (375×812).

## Phase 1 — Application audit

All 30 routes under `app/**/page.tsx` were loaded directly and checked for: successful load (HTTP 200), page `<title>` set, zero console errors, and correct content render (via `get_page_text`). Routes covered:

`/`, `/about`, `/contact`, `/legal/privacy`, `/legal/terms`, `/dashboard`, `/dashboard/alerts`, `/dashboard/automation`, `/dashboard/brief`, `/dashboard/notifications`, `/dashboard/portfolio`, `/dashboard/projects` (+ 11 collection routes: blue-chips, emerging, fast-growing, needs-review, new, recently-discovered, recently-updated, top-tvl, top-volume, trending, verified), `/dashboard/projects/[slug]` (tested with `usd-coin` and `aave`), `/dashboard/settings/{automation,notifications,personalization,search}`, `/dashboard/timeline`, `/dashboard/watchlist` (redirect), `/dashboard/watchlists`.

Result: **30/30 routes load cleanly** (200, correct content). One route (`/dashboard/projects/usd-coin`) reproduces a known, verified console warning in `RecentTransactions` — identified, reproduced, and root-caused this pass, with the fix deferred to PR-068 (see `KNOWN_ISSUES.md` and `REGRESSION_REPORT.md`). All other routes show zero console errors.

## Phase 2 — User flow testing

Verified a real sidebar-driven client-side navigation (Dashboard → Projects) resolves correctly via Next.js `<Link>`, with zero console errors and no full page reload (confirmed via `window.location.pathname` transition without a new `navigation` timing entry). Also verified an invalid project slug (`/dashboard/projects/this-project-does-not-exist`) renders the app's proper "Page not found" state rather than crashing.

## Phase 3 — Component validation

Spot-checked dashboard, Projects directory, and Project Profile pages for broken UI, overflow, and misalignment. No defects found beyond the two documented bugs.

## Phase 4 — Responsive testing

Checked the Projects directory page at mobile width (375×812): grid correctly collapses to 2 columns, sidebar collapses to a hamburger-triggered menu, search bar and stat cards remain fully readable with no horizontal overflow.

## Phase 5 — Accessibility

Confirmed interactive elements expose accessible names (e.g. "View notifications, 4 unread", "Switch to light theme", "Open account menu") via the accessibility tree. Full WCAG-level audit was not exhaustive given time constraints — see `ACCESSIBILITY_REPORT.md` for exact coverage.

## Phase 6 — Performance

No new performance work was done in this pass (out of scope per the Bug Fix Policy — review/recommend only, no changes unless fixing a verified bug). No performance regressions observed versus prior PR-065/PR-064 baselines.

## Phase 7 — Error handling

Confirmed: invalid project slug → proper 404. No-transfers / no-token-contract states already show honest copy (confirmed in earlier PR-065/PR-13.x work, not re-litigated here).

## Phase 8 — Regression testing

Confirmed via `npm test` (204/204 passing, 21 test files) and a full `npm run build` that Dashboard, Projects, Collections, Watchlists, Alerts, Automation, Timeline, Notifications, Portfolio, Settings, and the BrandLoader/SplashScreen loading system all still build and render correctly.

## Phase 9 — Cross-browser review

**Limitation, stated honestly**: this environment only provides a Chromium-based browser tool. Firefox and Safari compatibility was **not verified live** in this pass. The codebase uses no browser-specific APIs beyond standard `fetch`, CSS Grid/Flexbox, and CSS custom properties — all broadly supported — but this is a code-level inference, not a live cross-browser test result. See `KNOWN_ISSUES.md`.

## Phase 10 — Build validation

- `npx tsc --noEmit` — clean, zero errors.
- `npm run lint` — clean, zero errors/warnings.
- `npm test` (vitest) — 204/204 tests passing across 21 test files.
- `npm run build` — succeeds, all 34 routes generate correctly (one pre-existing non-blocking warning: `metadataBase` unset).
