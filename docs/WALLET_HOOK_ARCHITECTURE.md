# Wallet Hook Architecture

V4-FUTURE-002C/002D. How the Wallet platform's `lib/hooks/` layer composes,
what `WalletDataProvider` now owns, and what remains — honestly — as
un-eliminated duplication. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the
whole-app layering this document is a zoomed-in view of.

## Dependency graph

```
Portfolio Discovery (usePortfolio → holdings service)
        │
        ▼
Portfolio Intelligence (useWalletPortfolioIntelligence → buildPortfolioIntelligence)
        │
        ├──────────────────────────────────────────────┐
        ▼                                               ▼
Portfolio AI (useWalletPortfolioAI →              Wallet Automation (useWalletAutomation →
  buildPortfolioAI)                                  rules + event/result state)
        │                                               │
        │            ┌──────────────────────────────────┤
        │            ▼                                  ▼
        │      Wallet Analytics (useWalletAnalytics →   Wallet History (useWalletHistory →
        │        buildWalletAnalytics)                    localStorage snapshots; wraps
        │            │                                     useWalletAutomation again)
        │            ▼
        │      Reports (buildHistoricalReport — plain function, not a hook;
        │        called wherever a period is needed: 30d canonical, "all"
        │        canonical, or a user-selected period in WalletReportView)
        │            │
        └──────┬─────┴─────┬───────────────┐
               ▼            ▼               ▼
        Cross-Feature   Monthly Digest   Portfolio Story
        (buildCrossFeatureIntelligence)  (buildMonthlyDigest) (buildPortfolioStory)
               │                │               │
               └────────┬───────┴───────┬───────┘
                         ▼               ▼
                  Notification       Smart Report
                  Explainability     Sharing
                  (reads CrossFeature.indexes)  (reads Report + optional
                                                  Digest/Story/CrossFeature)
```

`AI Chat` (`useAIChat`) and `Guided Review` (`useGuidedReview`) sit beside
this graph, not inside it — `useAIChat` consumes Intelligence/AI/Analytics/
Automation/a 30d Report the same way Cross-Feature does, but ALSO owns
real session-local conversation state (`turns`), so it stays a
self-contained hook (see "What remains" below). `useGuidedReview` owns
only its own `localStorage` progress — it doesn't consume this graph at
all beyond receiving already-built props.

## `WalletDataProvider` — the single owner of derived state (as of 002D)

`components/wallet/WalletDataProvider.tsx` computes, ONCE per page:
`intelligence`, `ai`, `automation`, `analytics`/`history` (canonical
"all"-window), `walletHistory`, `report30d`, `reportAll`, `crossFeature`,
`digest`, `story`. As of 002D, `crossFeature`/`digest`/`story` are built by
calling `buildCrossFeatureIntelligence`/`buildMonthlyDigest`/
`buildPortfolioStory` — the underlying ENGINE functions — directly with
values the Provider already has, instead of going through the
`useCrossFeatureIntelligence`/`useMonthlyDigest`/`usePortfolioStory` HOOKS
(which remain fully intact, unchanged, and still used by `PortfolioWidget`,
`AutomationCenter`, and `AutomationWidget` — none of which are wrapped in
this Provider).

`WalletPortfolioPage`, `GuidedReviewPage`, and `WalletVerificationHarnessPage`
each wrap themselves in `<WalletDataProvider>` and read via `useWalletData()`.

## What remains — honestly not eliminated, and why

| Duplication | Where | Why it's left alone |
|---|---|---|
| `useWalletAutomation()` called twice inside `WalletDataProvider` (once directly for `automation`, once again inside `useWalletHistory()`) | `WalletDataProvider` | `useWalletHistory()` owns real `localStorage` persistence (append-on-new-snapshot, subscription) — genuinely stateful, not a pure derivation. Removing this would mean either redesigning `useWalletHistory`'s public API to accept an injected automation snapshot, or duplicating its persistence logic elsewhere — both worse trades than one harmless extra `useWalletAutomation()` call (itself mostly a `useSyncExternalStore` read plus small local event-accumulation state). |
| `buildHistoricalReport(history, analytics, "30d")` computed twice on `/dashboard/wallet` — once by `WalletDataProvider` (`report30d`), once again inside `useAIChat()` | `WalletPortfolioPage` (via `useAIChat()`, called directly, not through context) | `useAIChat()` is intentionally NOT wrapped in `WalletDataProvider` — its `turns`/`ask`/`clearConversation` are real per-consumer session state (`AutomationCenter` and `AutomationWidget` also call it directly and each gets an independent conversation). Injecting `report30d` would require adding a parameter to `useAIChat()`'s public signature — technically additive/optional, but this phase's "do not redesign public APIs" plus the fact that `buildHistoricalReport` is a cheap, pure, already-fast function made this not worth the API surface change for a bounded, single extra call. |
| `useCrossFeatureIntelligence`/`useMonthlyDigest`/`usePortfolioStory` (the HOOKS, not the engines) still independently self-compose when called from `PortfolioWidget`/`AutomationCenter`/`AutomationWidget` | Dashboard (`/dashboard`), Automation (`/dashboard/automation`) | Different ROUTES from `/dashboard/wallet` — a React Context can't share state across separate page mounts without a shared ancestor provider, and mounting `WalletDataProvider` at `app/dashboard/layout.tsx` would run the full Wallet hook chain on every Dashboard page (including ones that never needed it), a real behavior/performance change outside every 002-series phase's explicit "no user-visible behavior change" mandate. |

None of these three require touching a PUBLIC API's behavior/contract to
leave as-is — they're the genuine, irreducible remainder once "do not
redesign public APIs" and "don't run the Wallet chain on non-Wallet pages"
are both honored.
