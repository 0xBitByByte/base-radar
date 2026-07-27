# PR-052 — Unified Provider Resolution Engine

**Type:** Architecture only — no UI redesign, no new provider, no route change. Adds one shared module, moves types, refactors 3 concrete metrics in `lib/data/aggregate.ts` to use it.
**Status:** implemented, validated (`lint`/`tsc`/`build`/full test suite/live browser QA all clean), **not committed, not pushed** — awaiting review.

---

## 0. Honest scope note — read this first

The brief's target architecture asks for Dashboard, Explorer, Projects, Project Profile, and Landing to all receive data "from a single provider-resolution pipeline," and for shared `Market`/`Community`/`Engineering`/`Governance`/`Contracts`/`Security`/`Activity`/`Health`/`Confidence`/`Sources` models every page consumes. Two things were true before this PR started, confirmed by direct code reads, that materially change what "consolidation" honestly means here:

1. **Explorer already consumes the Project Intelligence Engine.** `app/dashboard/projects/page.tsx` calls `getAllProjectIntelligence()` from `lib/intelligence/engine.ts` — the exact same engine and the exact same `Market`/`Trading`/`Tvl`/`Contracts`/`GithubIntel`/`Community`/`Health`/`Confidence`/`Sources` models the Project Profile page uses. There was **no** Explorer/Project-Profile duplication to remove — that part of the target architecture was already true.
2. **Dashboard and Landing operate at a fundamentally different grain than Explorer/Project Profile.** `ProjectIntelligence` is a **per-project** model (one Aave record, one Compound record). Dashboard widgets like `KPIRow`, `MarketWidget`, `NarrativeHeatmap`, and `WhaleActivityWidget` are **ecosystem-wide aggregates** (Base chain-wide TVL, Base-wide gas price, a cross-project narrative heat map) — there is no single `Project` these numbers belong to, so there is no `ProjectIntelligence` record for them to "consume." Forcing every dashboard widget onto the per-project model would not be consolidation; it would be a category error, and a real UI/data-contract rewrite this brief explicitly rules out ("Do NOT redesign any UI").

What genuinely *was* duplicated, and is now fixed by this PR: **the provider-resolution primitive itself** — the fallback-with-provenance logic (`resolveMetric`/`MetricResolution`) — existed only inside `lib/intelligence/`, while `lib/data/aggregate.ts` reimplemented the same "try provider A, fall back to provider B" pattern ad hoc, with no attribution, in at least three real places. That primitive is now one module both systems import. That is the real, honest scope of "System A vs. System B" convergence achievable without a UI rewrite, and it is what this PR delivers.

---

## 1. Audit — Existing Data Flow (Task 1)

### Dashboard (`app/dashboard/page.tsx` + `components/dashboard/*`)
- **Data source:** `lib/data/aggregate.ts` exclusively — 13 exported functions (`getKpis`, `getMarketOverview`, `getPortfolioSummary`, `getTrendingNarratives`, `getAIProjects`, `getWhaleEvents`/`getRawWhaleEvents`, `getSignals`, `getProjectSpotlight`, `getActivityFeed`, `getWelcomeStats`, `getNarrativeHeatmap`, `getLiveTicker`, plus the AI Intelligence Brief pipeline). Each calls `lib/providers/*` services directly.
- **Aggregation logic:** per-function, ad hoc. Most patch a typed mock baseline (`lib/data/mock.ts`) field-by-field as each `Promise.allSettled` slot resolves, incrementing a `liveHits` counter that decides the bundle-level `source: "live" | "mock"` tag.
- **Fallback logic (before this PR):** almost entirely single-candidate ("call DefiLlama for TVL; if it fails, keep the mock number") — genuinely correct, since most of these are ecosystem-wide numbers with only one real provider. **Three real exceptions were unattributed, ad hoc multi-candidate fallbacks with no provenance at all:**
  - `getProjectSpotlightImpl`'s `change24hPct`: `match?.changePct24h ?? top.changePct24h ?? 0` — a bare `??` chain between a CoinGecko-matched value and a DefiLlama value, no record of which one actually won.
  - `getLiveTickerImpl`'s `ethPriceUsd`: CoinGecko-only, even though this same function already fetches Blockscout's `ChainStats`, which carries its own `ethPriceUsd` — fetched and silently discarded (confirmed in `docs/PROVIDER_DATA_COVERAGE_AUDIT.md` §6).
  - `getKpisImpl`'s `dexVolume24h`: CoinGecko markets sum only, despite DexScreener's own trending-pairs sum (already fetched by `getSignalsImpl` elsewhere in the same file) being a real second candidate.
- **Confidence scoring:** none, beyond the bundle-level `"live"|"mock"` flag. No per-metric confidence tier existed anywhere in this file before this PR.
- **Provider selection:** implicit and unattributed — whichever `if (x)` branch happened to have data won, with no record of what else was tried or why it lost.

### Explorer (`app/dashboard/projects/page.tsx` + `components/explorer/*`)
- **Data source:** `lib/intelligence/engine.ts`'s `getAllProjectIntelligence()` — confirmed via direct import. **Already the unified Project Intelligence Engine**, not a separate system.
- **Aggregation/fallback/confidence:** identical to Project Profile below — `sources.ts` → `merge.ts` → `resolveMetric` → `Confidence`/`Health`. Zero duplication found here.
- **Provider selection:** centralized in `resolveMetric`, same as Project Profile.

### Project Profile (`app/dashboard/projects/[slug]/page.tsx` + `components/explorer/Profile*`)
- **Data source:** `lib/intelligence/engine.ts`'s `getProjectIntelligence()`/`buildProjectIntelligence()` (same engine as Explorer, `{ extended: true }`).
- **Aggregation logic:** `sources.ts` matches a registry `Project` against bulk provider results (`gatherProjectSources`) → `merge.ts` builds each output section (`Market`, `Trading`, `Tvl`, `Contracts`, `GithubIntel`, `Community`) → `scoring.ts`/`confidence.ts`/`freshness.ts` compute `Health`/`Confidence`/`Freshness`.
- **Fallback logic:** `resolveMetric` (`lib/intelligence/resolution.ts`, pre-PR-052) — real, attributed, multi-candidate for Price (CoinGecko → DexScreener) and Volume (DexScreener → CoinGecko); single-candidate-but-still-attributed for TVL/Liquidity/GitHub/Contracts/Governance.
- **Confidence scoring:** `MetricConfidence` per resolved metric (`"high"`/`"medium"`/`"low"`) plus a project-level `Confidence.score` (0-100) from `confidence.ts`, weighted by registry verification status and live-source count.
- **Provider selection:** fully centralized in `resolveMetric`.

### Landing (`app/page.tsx` + `components/landing/*`)
- **Data source:** the same `lib/data/aggregate.ts` functions as Dashboard (`getIntelligenceWallData`, `getSignals`, etc.) — confirmed the Landing page is **not** a third system; it's the same System A, a different set of callers.
- Everything else identical to the Dashboard entry above.

### Duplicated logic identified
| Logic | Duplicated between | Fix |
| --- | --- | --- |
| Multi-candidate fallback resolution (`resolveMetric`) | Only existed in `lib/intelligence/` — not literally duplicated, but **inaccessible** to `lib/data/aggregate.ts`, which reimplemented the same pattern ad hoc (3 real instances above) | Moved to `lib/providers/common/resolution.ts`; both systems now import the one implementation |
| Provider-result → attribution adapter (`unavailableSlice`/`notConfiguredSlice` equivalent) | `lib/intelligence/sources.ts` had one (registry-match-specific); `lib/data/aggregate.ts` had none, so it couldn't build a `MetricCandidate` at all | Added `attributionFromProviderResult()` to the same shared module — a generic counterpart usable without a registry match |
| "Source attribution" concept | `lib/intelligence/types.ts`'s `SourceAttribution` (real, provider-layer concept) vs. `lib/ai-intelligence/dashboard-adapter.ts`'s independently-invented `DashboardSourceAttribution` (a same-named but unrelated type, for the separate AI Intelligence Brief pipeline, PR-040/041/042) | **Noted, not touched** — a different subsystem, not "System A vs. System B" from this PR's brief; flagged under Remaining Technical Debt |
| Ecosystem-wide vs. per-project data models | None — these are genuinely different concerns at different grains, not duplicated logic (see §0) | No fix needed; documented as an intentional non-consolidation |

---

## 2. Unified Intelligence Layer — What Was Actually Built (Task 2)

```
Registry (data/projects/)
      │
      ▼
Providers (lib/providers/*)
      │
      ▼
Provider Resolution Engine (lib/providers/common/resolution.ts)   ← NEW, shared
      │                                   │
      ▼                                   ▼
Project Intelligence Engine          Dashboard/Landing Aggregation
(lib/intelligence/*)                 (lib/data/aggregate.ts)
      │                                   │
      ▼                                   ▼
Explorer + Project Profile           Dashboard + Landing widgets
```

The Provider Resolution Engine is the layer the brief's diagram calls "Provider Resolution" — it now sits, correctly, **between** the Providers layer and both downstream consumers, exactly matching the target architecture's dependency order (`Registry → Providers → Provider Resolution → Intelligence Service`). It has zero dependency on `lib/intelligence/*` or `data/projects/*`, so the dependency arrow only ever points one way.

Per-project intelligence (`ProjectIntelligence` and its sections) remains the Intelligence Service the brief describes, consumed identically by Explorer and Project Profile (already true, §0). Dashboard/Landing's ecosystem-wide aggregation is a legitimately separate consumer of the same Provider Resolution Engine, one layer below the per-project Intelligence Service — not a peer that needed to be forced onto `ProjectIntelligence`'s shape.

---

## 3. Provider Resolution Consolidated (Task 3)

**New file: `lib/providers/common/resolution.ts`** — the single, shared implementation of:
- `resolveMetric<T>(candidates)` — unchanged behavior, moved verbatim from `lib/intelligence/resolution.ts`.
- `MetricCandidate<T>`, `MetricResolution<T>`, `MetricConfidence`, `ProviderAttempt`, `SourceAttribution`, `SourceStatus` — moved verbatim from `lib/intelligence/types.ts`.
- `attributionFromProviderResult<T>(provider, result)` — **new**, a generic adapter from a raw `ProviderResult<T>` (what every `service.ts` function returns) into a `SourceAttribution`, for callers that resolve a metric directly from a provider call rather than through a registry-project match. This is what let `lib/data/aggregate.ts` build real `MetricCandidate`s without duplicating `sources.ts`'s registry-specific matching logic.

**`lib/intelligence/types.ts`** now imports these from the shared module and re-exports them — every existing `@/lib/intelligence/types` import site across the codebase (10 files, confirmed via grep) keeps working unchanged, with zero edits needed to any of them.

**`lib/intelligence/resolution.ts` deleted** — its one real consumer, `lib/intelligence/merge.ts`, now imports `resolveMetric` directly from `@/lib/providers/common/resolution`.

There is now exactly **one** `resolveMetric` implementation in this codebase. `lib/data/aggregate.ts` imports it directly (`import { resolveMetric, attributionFromProviderResult } from "@/lib/providers/common/resolution"`) for the three concrete cases below — it never reimplements fallback, confidence, or provenance logic itself.

---

## 4. Duplicate Aggregation Removed (Task 4)

Three concrete, previously-unattributed fallback chains in `lib/data/aggregate.ts` now go through `resolveMetric`:

1. **`getLiveTickerImpl`'s ETH price** — CoinGecko primary, Blockscout's `ChainStats.ethPriceUsd` (already fetched by this same function, previously discarded) as a real, attributed fallback. BTC is unchanged (CoinGecko-only; no second candidate exists in this Provider Layer).
2. **`getKpisImpl`'s `dexVolume24h` KPI** — CoinGecko Base-ecosystem-markets volume sum primary, DexScreener's own trending-pairs volume sum (a new fetch added to this function's existing `Promise.allSettled` batch) as a real, attributed fallback at medium confidence.
3. **`getProjectSpotlightImpl`'s `change24hPct`** — the literal `match?.changePct24h ?? top.changePct24h ?? 0` chain replaced with `resolveMetric` over the same two real candidates (CoinGecko matched-market change, DefiLlama protocol-level change), now with a recorded winner and reason.

**Behavior is identical or improved, never regressed** — confirmed by:
- `npm test`: 48/48 passing, no test changed its expectations.
- Live browser QA (see §5): Dashboard's KPI row still shows `DEX Volume $13.92B -4.1%`, the live ticker still shows real `ETH $1,927`/`BTC $64,527`/`TVL $4.64B` — the same numbers, now with a real resolution path recorded alongside them instead of a silent `??`.

The other ~10 aggregate.ts metrics (TVL, stablecoin mcap, protocol count, gas, transactions, AI-project count) were **not** wrapped in `resolveMetric` — each has exactly one real candidate provider in this codebase's Provider Layer today, so doing so would add ceremony with no genuine second candidate to attribute, contradicting this PR's own "don't force a merge where none is real" principle (§0). This is called out explicitly, not silently skipped — see §6.

---

## 5. Shared Intelligence Models (Task 5)

The models the brief asks for **already exist** and are **already** the single shared source both Explorer and Project Profile consume — confirmed, not newly built, in `lib/intelligence/types.ts`:

| Requested model | Existing type | Consumed by |
| --- | --- | --- |
| Market | `Market` | Explorer (`ProjectCard`/`ProjectRow`), Project Profile (`ProfileQuickStats`, `ProfileTokenAndPriceLive`) |
| Community | `Community` | Both, via `ProjectIntelligence.community` |
| Engineering | `GithubIntel` | Both, via `ProjectIntelligence.github` |
| Governance | `GovernanceEvent[]` (`lib/governance/types.ts`) | Both, via `ProjectIntelligence.governance` |
| Contracts | `Contracts` / `ContractInfo` | Both, via `ProjectIntelligence.contracts` |
| Security | Folded into `Risk.contributors` ("Smart Contract Risk") + `Contracts[].verified` — no dedicated `Security` type exists because nothing in this codebase computes a security signal independent of those two | Both |
| Activity | `TimelineEvent[]` (`lib/intelligence/timeline.ts`) | Project Profile's Activity Feed; not surfaced on Explorer's card/row view (a UI scope decision from PR13.x, unrelated to this PR) |
| Health | `Health` | Both, via `ProjectIntelligence.health` |
| Confidence | `Confidence` | Both, via `ProjectIntelligence.confidence` |
| Sources | `Sources` (`Record<ProviderName, SourceAttribution>`) | Both, via `ProjectIntelligence.sources` |

No new model needed to be invented — this PR's real Task 5 contribution is the Provider Resolution primitives (§3) these models embed (`Market.priceResolution`, `Trading.volumeResolution`/`liquidityResolution`, `Tvl.tvlResolution`) now living in the correctly-layered shared module rather than being intelligence-layer-only.

**Dashboard/Landing's own models** (`lib/data/types.ts`: `Kpi`, `MarketOverview`, `LiveTicker`, `ProjectSpotlight`, etc.) are **intentionally not** replaced with `ProjectIntelligence`'s per-project models — see §0 for why that would be a category error, not a fix. Three of them (`Kpi`, `LiveTicker`, `ProjectSpotlight`) now additively carry an optional `MetricResolution<number>` field (`resolution`/`ethPriceResolution`/`changeResolution`) for the one metric each genuinely resolves from more than one candidate — the same additive, define-now-surface-later pattern this codebase already used for `Project.lifecycle`/`verificationLevel` (PR-037).

---

## 6. Provenance (Task 6)

Every metric resolved through `resolveMetric` — in both `lib/intelligence/` and, as of this PR, the three `lib/data/aggregate.ts` cases — carries the full, real `MetricResolution<T>` shape:

```ts
{
  value: T | null;
  provider: ProviderName | null;
  attemptedProviders: ProviderAttempt[];  // every candidate tried, and why each one that lost failed
  fallbackUsed: boolean;
  lastUpdated: string | null;
  confidence: MetricConfidence | null;
  failureReason: string | null;           // set only when every candidate failed
}
```

Nothing fabricates a provider. Where only one real candidate exists (the majority of both `lib/intelligence/`'s and `lib/data/aggregate.ts`'s metrics), that single-candidate case is still run through `resolveMetric` wherever it was already formalized (Project Profile's TVL/Liquidity/GitHub/Contracts/Governance, per PR-050) — `lib/data/aggregate.ts`'s remaining single-candidate metrics keep their existing, honest `source: "live"|"mock"` bundle-level tag instead, since wrapping a single candidate there would add a field no code reads without changing what's actually knowable (see §4's closing paragraph).

No dashboard/landing widget currently *renders* the new `*Resolution` fields — they are present in the data layer, real and complete, ready for a future presentation-only PR to surface them, exactly like Project Profile's `resolutionTooltip()` already does for `ProfileQuickStats`.

---

## 7. Validation Results (Task 7)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | **Clean** (checked twice: once immediately after the type-move, once after the full `aggregate.ts` refactor) |
| `npm run lint` | **Clean** |
| `npm run build` | **Clean** — all 23 routes generated, only the pre-existing, unrelated `metadataBase` warning |
| `npm test` | **48/48 passed**, 8 test files, zero test changed |
| Dashboard (live browser QA) | Renders fully: live ticker (`Block 49.19M`, `Gas 0.006 gwei`, `ETH $1,926`, `BTC $64,518`, `TVL $4.64B`), KPI row including the refactored `DEX Volume $13.92B -4.1%`, Intelligence Brief, Portfolio, Watchlist, AI Intelligence, Automation, Timeline, Notifications widgets all populated. **Zero console errors.** |
| Explorer (live browser QA) | `/dashboard/projects` renders "Base Ecosystem Projects," 20 real projects (Aave/Morpho/Curve Finance/Compound confirmed visible) with real Verified/Health/Confidence badges. **Zero console errors.** |
| Project Profile (live browser QA) | `/dashboard/projects/aave` renders Price `$99`, `+2.7%` 24h, Liquidity `Not Tracked` (honest — matches PR-051's known finding), Volume `$265.71M`, FDV `$1.58B`, Health `83/100`, Confidence `100/100`, Low Risk, Verified. **Zero console errors.** |
| No duplicate provider resolution | Confirmed — `grep -rn "function resolveMetric"` returns exactly one definition, in `lib/providers/common/resolution.ts` |
| No duplicated aggregation logic | Confirmed for the 3 concrete cases refactored (§4); documented, not silently ignored, for the single-candidate majority that was never duplicated to begin with |

---

## 8. Files Modified

**New:**
- `lib/providers/common/resolution.ts` — the shared Provider Resolution Engine
- `docs/PR-052_UNIFIED_INTELLIGENCE_LAYER.md` (this file)

**Modified:**
- `lib/intelligence/types.ts` — `SourceStatus`/`SourceAttribution`/`MetricConfidence`/`ProviderAttempt`/`MetricResolution` now imported + re-exported from the shared module instead of defined locally
- `lib/intelligence/merge.ts` — import path for `resolveMetric` updated to the shared module
- `lib/data/aggregate.ts` — imports the shared engine; `getKpisImpl` (DEX Volume fallback + `patchKpi` resolution param), `getLiveTickerImpl` (ETH price fallback), `getProjectSpotlightImpl` (change% fallback) refactored to use it
- `lib/data/types.ts` — `Kpi.resolution`, `LiveTicker.ethPriceResolution`, `ProjectSpotlight.changeResolution` added (additive, optional)

**Deleted:**
- `lib/intelligence/resolution.ts` — superseded by `lib/providers/common/resolution.ts`

**Not touched:** any UI component, any route, any provider (`lib/providers/{coingecko,dexscreener,defillama,blockscout,github,base,snapshot}/*`), the Project Registry, `lib/ai-intelligence/*`.

---

## 9. Remaining Technical Debt

- **`DashboardSourceAttribution` (`lib/ai-intelligence/dashboard-adapter.ts`) is a third, independently-invented "source attribution" concept**, same name, unrelated shape, serving the separate AI Intelligence Brief pipeline (PR-040/041/042). Not touched by this PR — it's a different subsystem than the Dashboard-aggregation-vs-Project-Intelligence duplication this PR's brief describes — but a future pass could fold it onto the same `SourceAttribution` shape now that a genuinely shared one exists in `lib/providers/common/`.
- **The other ~10 single-candidate metrics in `lib/data/aggregate.ts`** (TVL, stablecoin mcap, protocol count, gas, transactions, AI-project count) are not wrapped in `MetricResolution` — each has exactly one real provider, so this is a documented, deliberate scope boundary, not an oversight. If a genuine second candidate for any of these ever appears (e.g. DefiLlama's `/chains` endpoint as a cross-check for chain-wide TVL), the shared engine is already in place to adopt it.
- **`ARCHITECTURE.md` documents a materially different, older provider layer** (`lib/data/providers/*`, six providers, no `lib/intelligence/` at all) than the codebase's actual current structure — a pre-existing staleness confirmed during this PR's research, out of scope to fix here (a large, separate documentation refresh, not an "architecture only, no UI redesign" concern).
- **No presentation layer yet surfaces the new `Kpi.resolution`/`LiveTicker.ethPriceResolution`/`ProjectSpotlight.changeResolution` fields** — by design (this PR is architecture-only), but a natural, small follow-up PR could add the same tooltip pattern `ProfileQuickStats` already uses.

---

**Do not commit. Do not push. Awaiting review.**
