# Wallet Lookup Indexes

V4-FUTURE-002E. Not a speed optimization — the Wallet platform's current
datasets (≤90 history entries, a handful of automation results/events per
session) are small enough that every lookup below is already fast. This is
about establishing reusable, read-only index infrastructure before a
future feature grows one of these datasets. See
[`WALLET_HOOK_ARCHITECTURE.md`](WALLET_HOOK_ARCHITECTURE.md) for the
broader hook/engine dependency graph these indexes sit inside.

## What exists

| Index | Built by | Consumed by |
|---|---|---|
| `eventByAutomationId`, `recommendationByAutomationId`, `recommendationById`, `eventByTopic`, `eventByHighlight` | `lib/cross-feature/indexes.ts` (`buildCrossFeatureIndexes`, V4-FUTURE-001G) | `lib/notification-explain/{engine,timeline}.ts` |
| `resultByTriggeredAt` | `lib/wallet-automation/indexes.ts` (`buildAutomationIndexes`, this phase) | `RecentWalletEventsSection` (`components/wallet/WalletAutomationSections.tsx`) — replaced an O(events × results) `.find()` inside a render loop with an O(1) lookup |
| `indexByTimestamp` | `lib/wallet-history/indexes.ts` (`buildWalletHistoryIndexes`, this phase) | Built and tested; not yet wired into a consumer — see below |

All four follow the same rules: deterministic, immutable per array
version, built once via a single pass, additive (the source array is
never replaced — `Map` values are the SAME object references already in
the array, never copies), and "first write wins" to exactly match
`Array.prototype.find()`/`findIndex()`'s own "first match" semantics, so
swapping a `.find()` call for an index lookup is provably behavior-identical.

## What stayed array-based, and why

**History/Replay/Compare timestamp lookups** (`lib/cross-feature/refs.ts`,
`components/wallet/walletSnapshotCompare.ts`'s `findPreviousSnapshot`,
`components/wallet/walletReplayController.ts`'s `resolveReplayPosition`/
`replayPrevious`/`replayNext`) — five small, pure, already well-tested
functions each independently `.find()`/`.findIndex()` a snapshot by
timestamp. `buildWalletHistoryIndexes()` exists and could serve all five,
but wasn't wired in: threading an optional index parameter through five
call sites in working V4-HISTORY-era code, for a ≤90-entry array these
functions already resolve instantly, would trade real readability for an
unmeasurable gain — exactly what this phase's own brief says not to do.

**`AnalyticsHighlight` by `dedupeKey`** — no genuine repeated lookup exists
anywhere in the codebase today (`dedupeKey` is used only as a React `key`
prop and as the uniqueness check `lib/dev/walletAssertions.ts`'s
duplicated-highlights assertion already performs directly on the array).
Building a `highlightByDedupeKey` index with no real consumer would be
speculative infrastructure, not extraction of a genuine repeated pattern.

**`WalletEvent` by `id`** — same conclusion: no code anywhere looks up a
`WalletEvent` by its `id`; every consumer only ever iterates the array in
order. Not built.

**`PortfolioTrend` by `metric`** (`analytics.trends.find(t => t.metric === X)`)
— found to be genuinely repeated across FIVE files
(`lib/ai-chat/{answers,suggestions}.ts`, `lib/notification-explain/engine.ts`,
`lib/wallet-analytics/{correlation,summary,highlights}.ts`) during this
phase's investigation. Deliberately NOT addressed: `PortfolioTrend[]` is
not one of the six array types this phase's brief named
(`AutomationResult[]`, `WalletEvent[]`, `AnalyticsHighlight[]`,
`RecommendationCorrelation[]`, `CorrelatedEvent[]`, `AutomationSnapshot[]`),
and `lib/wallet-analytics/` is foundational, heavily-tested engine code —
extending scope into it wasn't requested. Flagged here so a future,
explicitly-scoped phase can pick it up rather than silently expanding this
one's footprint.

**Report Sharing** (`lib/report-share/engine.ts`) — investigated, found to
perform zero `.find()`/lookup calls over any of the six named array types;
every field it reads is a full-array `.map()` (rendering a section), never
a point lookup. Nothing to index there.
