# PR-097.07 QA Report

Scope: PR-097's own final QA pass (Platform Performance & Infrastructure —
.01 Performance, .02 Bundle Optimization, .03 Observability, .04 Testing,
.05 Security, .06 Production Readiness), plus closing out this repository's
long-standing QA backlog (`KNOWN_ISSUES.md`, PR-067). Not a redesign, not a
feature pass — verification and small, justified bug fixes only, matching
the established methodology this directory's earlier PR-066/PR-067 reports
used (`QA_TEST_PLAN.md`, `REGRESSION_REPORT.md`), scaled to what a
platform-infrastructure closeout actually needs rather than a full
app-wide route×breakpoint matrix.

## Phase 1 — Closing the pre-existing QA backlog

`KNOWN_ISSUES.md` (PR-067) has recorded three open issues for many
releases. All three were re-verified against the CURRENT codebase, not
assumed fixed:

| Issue | PR-067 status | Current status | Evidence |
| --- | --- | --- | --- |
| `RecentTransactions` duplicate React keys | Open, fix scheduled for PR-068 | **Fixed** | `components/explorer/RecentTransactions.tsx:54` keys by `` `${transfer.txHash}-${transfer.logIndex}` ``, exactly the recommended fix |
| `formatRelativeTime()` hydration mismatch (`IntelligenceBrief`, `WidgetCard` ×11, `RecentTransactions`) | Open, fix scheduled for PR-068 | **Fixed, and hardened further** | A dedicated `useRelativeTime()`/`RelativeTime` hydration-safe abstraction now exists (`lib/hooks/useRelativeTime.ts`, `components/shared/RelativeTime.tsx`), built on `useSyncExternalStore` with matching server/client snapshots. Its own doc comment records a **second**, more subtle bug (PR-075) found and fixed after the first naive fix — a passive-effect timing issue that could leave a value stuck on its placeholder inside a streamed Suspense boundary — resolved by actively notifying via `subscribe` rather than relying on React's internal consistency check. |
| `metadataBase` unset | Open, "before Beta/production deploy" | **Fixed** | `app/layout.tsx:24` — `metadataBase: new URL(SITE_URL)`, confirmed during PR-097.06's own investigation |

All three were real bugs, genuinely fixed by later work (untraceable to a
single PR from the current repository state alone), not something this
PR-097.07 pass needed to implement. `KNOWN_ISSUES.md` itself is left
unedited — it already self-labels its own origin ("as of PR-067") and
this report is the current, dated record superseding it; editing a
historical QA snapshot to reflect a much later state would misrepresent
what was actually known at the time it was written.

## Phase 2 — Automated regression (E2E + visual)

The full Playwright suite (`e2e/`, established in PR-097.04) was re-run
fresh against the current, final build — the first time it has run as one
complete pass since PR-097.05's CSP/rate-limiting and PR-097.06's
dependency version bumps landed on top of it.

```
23 passed (46.5s)
```

Every test passed: real SIWE login/admin-login/sign-out/non-admin-403,
Dashboard Topbar controls and responsive layout, Profile identity fields
and sign-out, Project Profile content and not-found handling, and all 6
visual regression baselines (Dashboard ×3 breakpoints, Profile ×2,
Topbar account menu). This is direct, current evidence that PR-097.05's
CSP and rate limiting, and PR-097.06's `nanoid`/`baseline-browser-mapping`
bumps, did not regress anything PR-097.04's own suite already covers.

## Phase 3 — Live spot-check beyond E2E coverage

Real running production server (`node .next/standalone/server.js`),
real SIWE admin session. Routes the existing E2E suite does not cover:

| Route | Result | Evidence |
| --- | --- | --- |
| `/dashboard/projects/emerging` (a Collection route) | Clean | Loads, zero console errors |
| `/dashboard/admin/registry` | Clean | Real data (20 discovered projects, "Registry valid — 0 errors, 1 warning"), zero console errors |
| `/dashboard/admin/roles` | Clean | Real, persisted role data; self-role-change correctly shown as disabled ("Cannot change your own role") — matches the server-side check `lib/admin/roles.ts` already enforces |
| `/dashboard/wallet` at mobile (375×812) | Clean | No horizontal overflow, real "No wallet connected" empty state, zero console errors |

## Phase 4 — Accessibility spot-check

Two `read_page` entries initially appeared nameless (a Sidebar nav link,
an icon-only button). Investigated directly against the live DOM
(`javascript_tool`) rather than taken at face value: the link has real,
visible text content ("Dashboard") the summarized accessibility-tree
view simply didn't surface, and a direct query for every `<button>`
lacking an `aria-label`, visible text, *and* a `title` attribute returned
zero elements. Both were false alarms from the investigation tooling's
own summarization, not real defects — recorded here specifically so this
isn't mistaken for an unchecked claim.

## Phase 5 — Build gates

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean.
- `npx vitest run` — 289 files / 2979 tests passing.
- `npm run build` — succeeds, same static/dynamic route split as every
  prior PR-097 sub-item's build.

## Out of scope for this pass, and why

A full route × breakpoint × browser matrix across the entire application
(the PR-066-era `QA_TEST_PLAN.md`'s own stated ambition) was not
attempted — PR-097 is a platform-infrastructure epic, not a feature or
UI pass, and re-auditing every one of the 60+ routes the app has grown to
since PR-066 is disproportionate to what this closeout's own findings
justify. Firefox/Safari cross-browser verification remains unavailable in
this environment, unchanged from every prior QA pass in this repository
(`QA_TEST_PLAN.md`'s own Phase 9).

## Result

No new product bugs found. No source code changes were needed as a
result of this QA pass — every finding either confirmed already-correct
behavior or closed out a stale documentation record.
