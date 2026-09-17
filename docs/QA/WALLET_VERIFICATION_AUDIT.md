# Wallet Platform — Verification Audit

V4-FUTURE-002A, Phase 1 (synthetic-route audit) and Phase 5 (architecture
audit). This is a readiness audit, not a feature — nothing here changes
behavior. See [`CONNECTED_WALLET_VERIFICATION_CHECKLIST.md`](CONNECTED_WALLET_VERIFICATION_CHECKLIST.md)
for the manual QA checklist this audit feeds into, and
`components/wallet/dev/WalletVerificationHarness.tsx` (route:
`/dashboard/wallet/verify`) for the reusable harness Phase 2 built.

## Phase 1 — Synthetic-route coverage checklist

Every Wallet-platform phase this arc (V4-HISTORY-001 through
V4-FUTURE-002) used one of three verification methods. This table is the
honest record of which method covered which feature, compiled from that
history rather than re-derived from guesswork.

| Feature | Deterministic tests | Synthetic browser verification | Still needs a real, funded wallet |
|---|---|---|---|
| Portfolio Intelligence / AI (scores, recommendations) | ✅ full engine + component coverage | ✅ (multiple phases) | Real holdings composition (many small dust balances, unpriced tokens, > 1 protocol) |
| Wallet Automation (rules, results, events) | ✅ full | ✅ | A rule firing from a REAL balance change across two REAL polls |
| Wallet Analytics (trends, highlights, milestones) | ✅ full | ✅ | Trend/­stability signals over weeks of REAL snapshots (this environment can't accumulate real history over time) |
| Wallet History (storage, browser, replay) | ✅ full | ✅ (synthetic snapshots) | Replay over a REAL multi-week snapshot history |
| Historical Reports | ✅ full | ✅ | — |
| Monthly Portfolio Digest | ✅ full | ✅ | A digest spanning a REAL calendar-month boundary |
| Portfolio Story Mode | ✅ full | ✅ (this session, temp route) | — |
| Guided Portfolio Review | ✅ full | ✅ (this session, temp route) | Resume behavior across a REAL multi-day gap |
| Smart Report Sharing | ✅ full | ✅ (this session, temp route) | — |
| AI Chat | ✅ full | ✅ | Every question answered against REAL holdings text (symbols, protocol names) |
| Cross-Feature Intelligence | ✅ full | ✅ | Correlation density over a REAL, longer event history |
| Notification Explainability (+ Timeline, + Lookup Index) | ✅ full | ✅ | — |
| Wallet Verification Harness (this phase) | ✅ (12 assertion tests, 3 harness smoke tests) | ✅ (this session) | Toggling to "Using Real Wallet Data" with an actual connection |

**Bottom line**: every engine and every UI surface has deterministic test
coverage and has been exercised in a real browser at least once, either
live (early phases, before a synthetic-fixture convention existed) or via
a temporary `*-preview-temp` route (later phases) or, as of this phase,
the persistent Harness. The **only** genuine gap across the whole
platform is real WALLET DATA — real balances, real price volatility, real
elapsed time between snapshots, and a real multi-week history. Nothing
about the CODE is unverified; what's unverified is how the code behaves
against inputs this sandbox cannot produce (no funded test wallet, no way
to let real time pass between snapshots).

### Every temporary preview route created this arc

All of the following were created, used for one verification pass, and
deleted the same session (confirmed via `git status` after each):
`app/dashboard/*-preview-temp/` for V4-HISTORY-002 through 005,
V4-AI-CHAT-001, V4-INTELLIGENCE-003, and V4-FUTURE-002's Story
Mode/Guided Review/Smart Sharing combined preview. None remain in the
repository. The Harness built in this phase (Phase 2) supersedes the need
for a new temp route per future feature — it is the first PERSISTENT
verification surface, by design (see its own file-level doc comment).

## Phase 5 — Architecture audit

Confirmed by direct grep/tool audit, not by assumption:

- **No duplicated engines.** Exactly one definition each of
  `buildHistoricalReport`, `buildCrossFeatureIntelligence`,
  `buildWalletAnalytics`, `buildPortfolioAI`, `buildMonthlyDigest`,
  `buildPortfolioStory`, `buildNotificationExplanation`,
  `downloadTextFile`. One naming collision found and investigated:
  `buildPortfolioIntelligence` exists in BOTH `lib/portfolio-intelligence/engine.ts`
  (wallet holdings) and `lib/portfolio/engine.ts` (watchlist projects) —
  confirmed these are two legitimately distinct engines over two
  different domains that happen to share a name (already flagged in
  `WalletPortfolioPage.tsx`'s own doc comment, predates this arc). Not a
  duplicate calculation; a naming clarity issue worth a rename in a
  future pass, out of this phase's "do not redesign" scope.
- **No circular imports.** `npx madge --circular` across `lib/`,
  `components/`, `app/` (800 files): **"No circular dependency found."**
- **No duplicate calculations.** Every V4-FUTURE-00x engine this session
  built (Report Export, Monthly Digest, Notification Explainability,
  Portfolio Story, Smart Report Sharing) was verified at build time via
  direct import grep to confirm zero calls to `buildWalletAnalytics`,
  `buildPortfolioIntelligence`, `buildPortfolioAI`,
  `buildCrossFeatureIntelligence`, or `askQuestion` — each consumes
  already-built outputs only.
- **No duplicated rendering pipelines.** Exactly one Markdown/Text/HTML
  renderer (`lib/export/render.ts`), reused verbatim by
  `lib/report-export/`, `lib/monthly-digest/export.ts`,
  `lib/portfolio-story/export.ts`, and `lib/report-share/engine.ts` — none
  of the four re-implements a renderer. `WalletVerificationHarness`
  mounts the SAME section components every production page already
  renders (`PortfolioHealthSection`, `AutomationStatusSection`, etc.) — a
  second call site, never a second implementation.
- **No duplicate export logic.** Confirmed above — one render layer, four
  section-builders (`buildReportExportSections`,
  `buildDigestOnlyExportSections`, `buildStoryOnlyExportSections`, and
  Smart Sharing's own toggle-gated additions), each owning only the
  fields genuinely unique to its feature.

## Known, out-of-scope observation (not fixed this phase)

A single React console warning ("Can't perform a React state update on a
component that hasn't mounted yet") was observed on `/dashboard/wallet`
in V4-FUTURE-002's live verification, present even with no Wallet
Verification Harness code involved and reproducible on a clean tab.
Traced as far as ruling out every line changed in that session's diff (no
render-phase `setState` introduced); root cause not isolated (would have
required `git stash`, which this session's tooling declined to run
without explicit user authorization). Flagged here for whoever
investigates next rather than silently dropped.

**Update (V4-FUTURE-002G Phase 9 sweep)**: re-checked on fresh tabs across
12 pages with zero production code changed this phase (pure investigation
+ 2 test additions). The warning is **not Wallet-specific** — it
reproduces on `/dashboard/wallet`, `/dashboard/profile`,
`/dashboard/settings/notifications`, and `/dashboard/settings/personalization`,
but NOT on `/dashboard`, `/dashboard/automation`, `/dashboard/notifications`,
`/dashboard/timeline`, `/dashboard/settings/automation`, or
`/dashboard/settings/search`. This is app-wide, pre-existing, and
unrelated to any V4-FUTURE-00x work — likely a shared client component
present on some layouts but not others. Still out of scope for a
Wallet-focused arc; flagged more precisely for whoever picks it up.
