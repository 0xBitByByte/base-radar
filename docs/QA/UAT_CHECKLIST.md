# PR-066 UAT Checklist

Each item reflects a real check performed during this QA pass, not a template assumption.

## Navigation & routing

- [x] All 30 routes load successfully (200, correct title, real content)
- [x] Sidebar navigation (`<Link>`-based) performs genuine client-side transitions
- [x] Invalid project slug renders a proper "Page not found" state, not a crash
- [x] `/dashboard/watchlist` correctly redirects to `/dashboard/watchlists`
- [x] Breadcrumbs and "Back to Projects" links present on Project Profile pages

## Dashboard

- [x] Loads with zero console errors (the separately-tracked `RecentTransactions` duplicate-key issue affects Project Profile pages, not the Dashboard — see `KNOWN_ISSUES.md`)
- [x] Getting Started onboarding card renders and its links resolve correctly
- [x] Intelligence Brief, Portfolio, Watchlist, Alerts, Automation, Trending widgets all render
- [ ] Hydration mismatch in Intelligence Brief / widget "Updated X ago" timestamps — **known issue, not fixed in this PR**, see `KNOWN_ISSUES.md`

## Project Profile

- [x] Header, Executive Intelligence, Scorecard, Token & Price, Contracts, Governance, Community, Network, Timeline sections all render
- [ ] Recent Transactions list — duplicate/missing-key React warning identified, reproduced, and root-caused this pass; **fix deferred to PR-068** (see `KNOWN_ISSUES.md`)
- [x] Verified against both a data-rich project (Aave) and a high-volume token project (USD Coin)

## Collections & Discovery

- [x] All 11 collection routes (blue-chips, emerging, fast-growing, needs-review, new, recently-discovered, recently-updated, top-tvl, top-volume, trending, verified) load with correct titles and content

## Settings

- [x] All 4 settings pages (automation, notifications, personalization, search) load cleanly

## Responsive

- [x] Mobile (375×812) layout on Projects directory: no overflow, correct 2-column grid, working hamburger nav

## Build & release gates

- [x] `tsc --noEmit` clean
- [x] `lint` clean
- [x] `test` — 204/204 passing
- [x] `build` succeeds for all 34 generated routes

## Explicitly not verified in this pass

- [ ] Firefox / Safari live rendering (tooling limitation — Chromium only)
- [ ] Full WCAG 2.1 AA contrast audit across every page
- [ ] Every responsive breakpoint × every route matrix (spot-checked only)
