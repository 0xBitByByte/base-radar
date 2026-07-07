# API

Base Radar does not currently expose an HTTP API. There is no `app/api`
route handler in the codebase — every "API" described below is an
**internal TypeScript function boundary** between layers of the same
Next.js application, called directly (`await getX()`) from Server
Components. This document catalogs those internal interfaces as they exist
today, plus the internal interfaces and endpoints that are planned but not
yet built.

For how these layers fit together structurally, see
[ARCHITECTURE.md](ARCHITECTURE.md). This document is the reference for what
each function actually takes and returns.

## Internal Architecture

```
 Widget (Server Component)
        │  calls
        ▼
 Services API        lib/data/aggregate.ts   — one function per widget's data need
        │  calls
        ▼
 Providers API        lib/data/providers/*    — one module per external data source
        │  calls
        ▼
 External APIs        CoinGecko, DexScreener, DefiLlama, Blockscout, Base RPC, GitHub

 Registry API         data/projects/helpers.ts — reads static, in-memory data (no network)

 Hooks API             lib/hooks/*             — client-side wrapper around a subset
                                                    of the above, for polling
```

Three properties hold across every internal API in this system:

- **Providers never throw.** Every provider function resolves to `null` on
  failure instead of throwing, so a failing external API degrades one field
  rather than crashing a page.
- **Services never throw either.** Aggregator functions in `aggregate.ts`
  catch internally and fall back to typed mock data; a widget can always
  render.
- **Every services-layer result is source-tagged.** Return types are
  `WithSource<T> = T & { source: "live" | "mock" }`, so callers (and,
  transitively, the UI) always know whether a result is real-time or
  fallback data.

## Current Helper Functions

### Services API — `lib/data/aggregate.ts`

This is the API surface every widget actually consumes. Each function takes
no arguments and resolves to a `WithSource<T>` (or an array with a `source`
property attached via `Object.assign`).

| Function | Returns | Backed by |
| --- | --- | --- |
| `getKpis()` | `WithSource<{ items: Kpi[] }>` | DefiLlama, Base RPC, CoinGecko, Blockscout |
| `getMarketOverview()` | `WithSource<MarketOverview>` | Base RPC |
| `getPortfolioSummary()` | `WithSource<PortfolioSummary>` | Mock only — no wallet connect yet |
| `getTrendingNarratives()` | `WithSource<Narrative[]>` | Mock only — no classification provider yet |
| `getAIProjects()` | `WithSource<AIProject[]>` | CoinGecko |
| `getWhaleEvents()` | `WithSource<WhaleEvent[]>` | Mock only — no free whale-indexing provider |
| `getSignals()` | `WithSource<Signal[]>` | DexScreener |
| `getProjectSpotlight()` | `WithSource<ProjectSpotlight>` | DefiLlama, CoinGecko, GitHub |
| `getActivityFeed()` | `WithSource<ActivityEvent[]>` | GitHub, DexScreener, Blockscout |
| `getWelcomeStats()` | `WithSource<WelcomeStats>` | DefiLlama, Base RPC, GitHub |
| `getIntelligenceBrief()` | `WithSource<IntelligenceBrief>` | Composed from `getKpis`, `getMarketOverview`, `getWelcomeStats`, `getSignals` |
| `getNarrativeHeatmap()` | `WithSource<NarrativeHeatRow[]>` | Mock only — curated, no classification provider yet |
| `getWatchlist()` | `WithSource<WatchlistItem[]>` | Mock only — requires accounts/wallet connect |
| `getLiveTicker()` | `WithSource<LiveTicker>` | Base RPC, CoinGecko, DefiLlama, Blockscout |
| `getDashboardData()` | `DashboardData` (all of the above, fanned out via `Promise.all`) | — |

`DashboardData` is the single object `app/dashboard/page.tsx` destructures
to render every widget; `getLiveTicker()` is called separately by
`app/dashboard/layout.tsx` for the shell's status bar.

### Providers API — `lib/data/providers/*`

Each function talks to exactly one external API and resolves to typed data
or `null` — never a raw HTTP error.

| Module | Function | Signature | Notes |
| --- | --- | --- | --- |
| `baseRpc.ts` | `getBaseNetworkStatus()` | `(): Promise<{ gasGwei, blockHeight, txCountLatestBlock, estimatedTps, chainId } \| null>` | Base mainnet JSON-RPC |
| `blockscout.ts` | `getChainStats()` | `(): Promise<ChainStats \| null>` | Total addresses/transactions, daily tx count, block time, utilization |
| `blockscout.ts` | `getRecentlyVerifiedContract()` | `(): Promise<VerifiedContract \| null>` | Powers the activity feed's verification event |
| `coingecko.ts` | `getBaseEcosystemMarkets(perPage = 20)` | `(perPage?: number): Promise<CoinGeckoMarket[] \| null>` | Market data filtered to the `base-ecosystem` category |
| `coingecko.ts` | `getMajorPrices()` | `(): Promise<MajorPrices \| null>` | ETH + BTC price and 24h change |
| `coingecko.ts` | `getEthPrice()` | `(): Promise<{ usd, changePct24h } \| null>` | Exported but not currently called by any aggregator function |
| `defillama.ts` | `getBaseChainTvl()` | `(): Promise<{ tvlUsd, changePct24h } \| null>` | |
| `defillama.ts` | `getBaseStablecoinMcap()` | `(): Promise<number \| null>` | |
| `defillama.ts` | `getBaseProtocols()` | `(): Promise<LlamaProtocol[] \| null>` | |
| `defillama.ts` | `getTopBaseProtocol()` | `(): Promise<LlamaProtocol \| null>` | Highest-TVL Base protocol; feeds Project Spotlight |
| `defillama.ts` | `getBaseProjectCount()` | `(): Promise<number \| null>` | Exported but not currently called by any aggregator function |
| `dexscreener.ts` | `getBaseTrendingPairs()` | `(): Promise<DexScreenerPair[] \| null>` | |
| `github.ts` | `getRepoStats(fullName)` | `(fullName: string): Promise<RepoStats \| null>` | Stars, forks, open issues, latest release |

### Registry API — `data/projects/helpers.ts`

Synchronous, in-memory reads over the static Project Registry — no network
calls, no `source` tagging (there is no live/mock distinction for static
data).

| Function | Signature | Behavior |
| --- | --- | --- |
| `getProjects()` | `(): Project[]` | Every project, in seed order |
| `getProject(idOrSlug)` | `(idOrSlug: string): Project \| undefined` | Match by `id` or `slug` |
| `getProjectsByCategory(category)` | `(category: ProjectCategory): Project[]` | Filter by category membership |
| `getProjectsByTag(tag)` | `(tag: ProjectTag): Project[]` | Filter by tag membership |
| `getProjectsByVerificationStatus(status)` | `(status: VerificationStatus): Project[]` | Filter by verification status |
| `searchProjects(query)` | `(query: string): Project[]` | Case-insensitive match across name, short description, tags, categories; empty string returns `[]` |

All are re-exported from the `data/projects` barrel alongside the `Project`
type, enums, and `PROJECTS` (the full array).

### Hooks API — `lib/hooks/*`

Client-only wrappers that own a polling or ticking lifecycle. Not a data
API in themselves — both currently call into the Providers/Services APIs
above.

| Hook | Signature | Behavior |
| --- | --- | --- |
| `useLiveNetworkStatus(pollMs = 45000)` | `(pollMs?: number): { status: LiveNetworkStatus \| null, updatedAt: number \| null }` | Polls `getBaseNetworkStatus()` on an interval |
| `useNowTick(intervalMs = 1000)` | `(intervalMs?: number): number` | Re-renders on an interval so relative timestamps stay current; fetches nothing |

### Formatting utilities — `lib/data/format.ts`

Pure functions, not part of the data-flow API, but used throughout the UI
layer to render values consistently: `formatCompactCurrency`,
`formatPrice`, `formatCompactNumber`, `formatNumber`, `formatGwei`,
`formatPercent`, `formatRelativeTime`.

## Future Provider Interfaces

These are internal interfaces the codebase is already shaped for but does
not implement yet. Each would live in `lib/data/providers/` and follow the
existing contract (typed success shape or `null`, never throw), so no
existing widget or aggregator function would need to change shape — only
its call site in `aggregate.ts` would start awaiting a real provider instead
of returning mock data.

| Planned provider interface | Would replace | Status |
| --- | --- | --- |
| Wallet balances provider | `getPortfolioSummary()`'s mock data | Planned — requires wallet connect, no free API exists for this today |
| Whale-transfer indexing provider | `getWhaleEvents()`'s mock data | Planned — noted in code as requiring a paid API (e.g. Whale Alert) |
| Narrative/category classification provider | `getTrendingNarratives()` and `getNarrativeHeatmap()`'s mock data | Planned — no free API currently exposes this classification |
| Registry-to-live-data join | New function(s) reading both `data/projects` and `lib/data/providers` | Planned — every `Project` already carries the `providerIds` this would key off |

## Future API Endpoints

Base Radar has no `app/api` routes today; every internal interface above is
a plain function call within the same server process, not an HTTP
boundary. The following are **planned, not implemented** — they would only
become necessary once a client needs to fetch data independently of a
Server Component render (e.g. a searchable Projects Explorer, or a public
integration surface):

| Planned endpoint | Purpose |
| --- | --- |
| `GET /api/projects` | List/search the Project Registry — a thin HTTP wrapper over `getProjects()` / `searchProjects()` |
| `GET /api/projects/[slug]` | Single project detail — wraps `getProject(idOrSlug)` |
| `GET /api/dashboard` | JSON snapshot of `getDashboardData()`, for a client-side refresh without a full page reload |
| `GET /api/signals` | Standalone signals feed, if Signals & Alerts becomes its own page independent of the dashboard grid |

None of these exist yet. They are listed here because the current function
signatures in `aggregate.ts` and `helpers.ts` are already shaped to sit
directly behind a route handler with minimal adaptation, not because any
route handler has been scaffolded.
