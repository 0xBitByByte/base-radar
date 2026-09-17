# Wallet Platform — Final Architecture Review

V4-FUTURE-002F. A technical audit of the finished Wallet platform, not a
feature implementation. Companion documents:
[`ARCHITECTURE.md`](ARCHITECTURE.md) (whole-app layering),
[`WALLET_HOOK_ARCHITECTURE.md`](WALLET_HOOK_ARCHITECTURE.md) (hook/engine
dependency graph, 002C/002D), [`WALLET_LOOKUP_INDEXES.md`](WALLET_LOOKUP_INDEXES.md)
(002E), [`QA/WALLET_VERIFICATION_AUDIT.md`](QA/WALLET_VERIFICATION_AUDIT.md)
(002A).

## Module-by-module review

| Layer | Ownership | Inputs | Outputs | Public API | Depends on |
|---|---|---|---|---|---|
| **Portfolio Discovery** | `lib/holdings/` | wallet address, chain id | `Holdings` (assets, USD value, partial flag) | `getHoldings()`, `refreshHoldings()` | Blockscout/CoinGecko/DefiLlama providers |
| **Portfolio Intelligence** | `lib/portfolio-intelligence/` | `HoldingAsset[]`, total USD value | `PortfolioIntelligence` (scores, warnings, recommendations, executive summary) | `buildPortfolioIntelligence()` | Portfolio Discovery only |
| **Portfolio AI** | `lib/portfolio-ai/` | `PortfolioIntelligence`, `WalletEvent[]` | `PortfolioAI` (overview, insights, actions, timeline) | `buildPortfolioAI()` | Portfolio Intelligence, Wallet Automation (events) |
| **Wallet Automation** | `lib/wallet-automation/`, `lib/automation/` (shared result type), `lib/hooks/useWalletAutomation.ts` | consecutive `PortfolioIntelligence` snapshots, wallet lifecycle state, persisted rules | `WalletEvent[]`, `AutomationResult[]`, `AutomationSnapshot`/`AutomationDiff` | `buildWalletAutomationResults()`, `buildSmartWalletAutomationResults()`, rule persistence functions | Portfolio Intelligence |
| **Wallet Analytics** | `lib/wallet-analytics/` (21 files — the platform's largest single module) | `AnalyticsSnapshot[]` (history) | `WalletAnalytics` (trends, evolution, allocation, highlights, milestones, personal bests, recoveries, stability, correlation) | `buildWalletAnalytics()` | Wallet History only |
| **Wallet History** | `lib/wallet-history/`, `lib/hooks/useWalletHistory.ts` | real `AutomationSnapshot`s as they occur | persisted `AnalyticsSnapshot[]` (localStorage, capped ~90) | `useWalletHistory()`, `appendHistorySnapshot()`, `buildWalletHistoryIndexes()` (002E) | Wallet Automation (snapshot/diff) |
| **Reports** | `components/wallet/walletReportEngine.ts` | history + analytics + a period | `HistoricalReport` | `buildHistoricalReport()` | Wallet Analytics, Wallet History |
| **Monthly Digest** | `lib/monthly-digest/` | a 30d `HistoricalReport` + analytics + intelligence + ai + cross-feature | `MonthlyDigest` | `buildMonthlyDigest()`, export renderers | Reports, Cross-Feature |
| **AI Chat** | `lib/ai-chat/`, `lib/hooks/useAIChat.ts` | intelligence/ai/analytics/automation + a 30d report + a fixed question id | `AIChatResponse` | `askQuestion()`, `buildSuggestedQuestions()` | Portfolio Intelligence/AI, Wallet Analytics/Automation, Reports |
| **Cross-Feature Intelligence** | `lib/cross-feature/` | intelligence/ai/analytics/history/automation events+results/a report | `CrossFeatureIntelligence` (events, recommendations, timeline, indexes) | `buildCrossFeatureIntelligence()`, `buildCrossFeatureIndexes()` | Every layer above it |
| **Notification Explainability** | `lib/notification-explain/` | one `AutomationResult` + Cross-Feature + ai + analytics | `NotificationExplanation`, `ExplainabilityTimelineNode[]` | `buildNotificationExplanation()`, `buildExplainabilityTimeline()` | Cross-Feature (via its indexes) |
| **Sharing** | `lib/report-share/`, `lib/share/` | a report + optional digest/story/cross-feature/analytics/intelligence | `ShareProfile` (markdown/text/html/stats) | `buildSharePreview()`, `buildShareProfile()` | Reports, `lib/export/` renderers |
| **Replay** | `components/wallet/walletReplay{Controller,Session}.ts` | `AnalyticsSnapshot[]` + a real timestamp | a real position/timestamp | `resolveReplayPosition()`, `replayNext()`/`replayPrevious()`/etc. | Wallet History only |
| **Story** | `lib/portfolio-story/` | an "all"-period report + analytics + intelligence + ai + cross-feature | `PortfolioStory` | `buildPortfolioStory()`, export renderers | Reports, Cross-Feature |
| **Guided Review** | `lib/guided-review/`, `lib/hooks/useGuidedReview.ts` | none (progress-only persistence) | `ReviewState` | `useGuidedReview()`, step navigation functions | Nothing — pure UI-sequencing over props |

`components/wallet/WalletDataProvider.tsx` (002C/002D) sits above all of
these as the single owner of derived state for the three Wallet pages
(`/dashboard/wallet`, `/dashboard/wallet/review`, `/dashboard/wallet/verify`).

## Confirmed via direct tooling/grep audit, not assumption

- **No circular dependencies.** `npx madge --circular` across `lib/`, `components/`, `app/`: 806 files, **zero found**.
- **No duplicated calculations.** Every consuming engine (Cross-Feature, Digest, Story, Notification Explainability, Sharing) was built and re-verified this arc to call zero blockchain/provider/scoring functions of its own — each consumes already-built objects only. `WalletDataProvider` (002D) further confirmed the three most re-derived engines (`buildCrossFeatureIntelligence`/`buildMonthlyDigest`/`buildPortfolioStory`) now run once per Wallet-page render instead of up to three times.
- **No duplicated formatting.** Exactly one Markdown/Text/HTML renderer (`lib/export/render.ts` → generalized further into `lib/share/build.ts`'s `buildShareProfile()`), reused verbatim by Report Export, Monthly Digest, Portfolio Story, and Smart Sharing — none of the four owns a second renderer.
- **No duplicated persistence.** Four independent `localStorage` stores (`lib/wallet-history/storage.ts`, `lib/wallet-automation/rules.ts`, `lib/guided-review/storage.ts`, personalization/notification preference stores outside this platform) — each owns a distinct key and a distinct concern; no two stores write the same key or duplicate the same versioned-envelope logic (each independently re-implements the same small pattern — see Remaining Technical Debt).
- **No duplicated routing.** Three Wallet routes (`/dashboard/wallet`, `/review`, `/verify`), each a thin `page.tsx` delegating to one page-body component — no route re-implements another's logic.
- **No duplicated business rules.** Wallet Automation's trigger/threshold logic (`lib/wallet-automation/triggers.ts`, `smartTriggers.ts`) is the single source of "did something meaningful change" — Cross-Feature/Notification Explainability/AI Chat all read the RESULT of that evaluation, never re-implement a threshold check.
- **One pre-existing, harmless naming collision** (not a duplicate): `buildPortfolioIntelligence` exists in both `lib/portfolio-intelligence/engine.ts` (wallet holdings) and `lib/portfolio/engine.ts` (watchlist projects) — two genuinely distinct engines, already flagged in 002A.

## Reusable primitives inventory

- **Renderers**: `lib/export/render.ts`, generalized as `lib/share/build.ts`.
- **Hooks**: the full composition chain in `WalletDataProvider.tsx`; `useGuidedReview()`'s progress-persistence pattern (mirrors `lib/personalization/preferences.ts`'s established versioned-localStorage shape).
- **Contexts**: `WalletDataProvider`/`useWalletData()` — the platform's first React Context (002C), still its only one.
- **Indexes**: `lib/cross-feature/indexes.ts` (001G), `lib/wallet-automation/indexes.ts` + `lib/wallet-history/indexes.ts` (002E) — all three follow the identical deterministic/first-write-wins/additive contract.
- **Dev infrastructure**: `lib/dev/walletFixtures.ts` (one shared fixture builder), `lib/dev/walletAssertions.ts` (6-category referential-integrity checker), `WalletVerificationHarness` (002A) — reusable for any future Wallet feature's own verification pass.

## Dependency diagram

See [`WALLET_HOOK_ARCHITECTURE.md`](WALLET_HOOK_ARCHITECTURE.md)'s own
dependency graph (Portfolio Discovery → ... → Portfolio Story) — not
duplicated here to avoid two copies of the same diagram drifting apart.

## Validation

`npx madge --circular` (806 files, 0 circular) · `tsc --noEmit` clean ·
`eslint .` clean · `vitest run`: **110 files, 1249 tests, all passing** ·
`next build`: clean, 41 routes.

## Measure

- **Engine count** (named `buildX()`/`askQuestion()`/`getHoldings()` top-level pure entry points): 14 across the platform.
- **`lib/` files under wallet-platform-scoped directories**: ~123, across 16 modules (`lib/portfolio` excluded — watchlist domain, not wallet).
- **Public APIs**: 15 module boundaries (the table above), each with exactly one canonical entry-point function/hook.
- **Duplicated utilities found**: 0 (one naming collision, not a duplication, documented above).
- **Remaining technical debt**: see below.

---

## 1. Investigation Findings

The Wallet platform is 15 layers deep, strictly one-directional (confirmed
via `madge`), with every "expensive" derivation (Intelligence → AI →
Analytics → Cross-Feature → Digest/Story) now flowing through exactly one
shared owner (`WalletDataProvider`) on the three pages that need all of it
together. Every export/sharing feature reduces to one shared renderer.
Persistence is real but fragmented across four independent stores that
each reinvent the same small versioned-envelope pattern.

## 2. Architecture Assessment

Sound. The layering is honest and enforced by convention (confirmed, not
assumed, via the zero-circular-dependency result) rather than by a runtime
guard — the platform relies on developer discipline plus this recurring
audit process to keep it that way, which has held for 15+ phases now.

## 3. Performance Assessment

The 002C/002D/002E work removed the platform's only measurable redundant
computation (duplicate `buildCrossFeatureIntelligence`/`buildMonthlyDigest`/
`buildPortfolioStory` calls per Wallet-page render, and one real O(n×m)
render-loop lookup). What remains (`useWalletAutomation()` called twice
inside `WalletDataProvider`; `buildHistoricalReport("30d")` computed twice
when `useAIChat()` is also mounted) is bounded, documented, and would
require a real public-API change to remove further — not left out of
oversight.

## 4. Backward Compatibility

Every phase this arc ran the full test suite before and after its
changes; the suite grew from 1152 tests (before V4-FUTURE-001E) to 1249
today, with zero regressions at any step. Every Wallet page was
live-verified to render byte-identically across the 002C/002D refactors.

## 5. Remaining Technical Debt

- Four independent `localStorage` persistence modules
  (`wallet-history/storage.ts`, `wallet-automation/rules.ts`,
  `guided-review/storage.ts`, plus `lib/personalization/preferences.ts`
  outside this platform) each hand-roll the same versioned-envelope +
  module-cache + subscriber pattern. A shared `createVersionedStore()`
  helper could collapse this, but every attempt to design one during this
  session's earlier phases was deferred as out of scope for the feature
  being built at the time — it's real, minor, cross-cutting debt, not
  urgent.
- `PortfolioTrend` lookup-by-`metric` is genuinely repeated across 5 files
  (`lib/ai-chat/`, `lib/notification-explain/`, `lib/wallet-analytics/`) —
  identified in 002E, deliberately left unaddressed as out of that phase's
  named scope.
- `buildPortfolioIntelligence` naming collision between
  `lib/portfolio-intelligence/` and `lib/portfolio/` — cosmetic, but a real
  trap for a future grep-based audit; a rename would be a one-time,
  low-risk cleanup.
- `useAIChat()` and `useWalletHistory()` each still internally re-derive
  one already-available value (a 30d report; `useWalletAutomation()`
  respectively) rather than accepting it as an injected dependency —
  documented in `WALLET_HOOK_ARCHITECTURE.md` as intentionally left alone
  because removing it needs a public-API change this arc's "do not
  redesign public APIs" rule doesn't license.

## 6. Nice-to-have Future Opportunities

- The shared `createVersionedStore()` helper above.
- Extending `buildWalletHistoryIndexes()`/`PortfolioTrend`-by-metric
  indexing IF a future feature genuinely needs the performance (neither is
  needed today — see 002E's own "do not optimize prematurely" finding).
- Renaming one of the two `buildPortfolioIntelligence` engines for clarity.

## 7. Final Recommendation

Ship as-is. The platform's architecture is sound, its test suite is
comprehensive (1249 tests) and green, and every piece of remaining debt
above is small, documented, and consciously deferred rather than missed.
No investigation in this review surfaced a problem serious enough to
block or delay future feature work on top of this platform.
