# Featured Intelligence Architecture

**Status:** Current, as of PR-099. PR-098.08 locked the pre-live architecture;
PR-099 wired live per-project dimension normalization and `computeRadarScore()`
into the Featured Ecosystem pipeline (§F is the section that changed; every
other section's PR-098 conclusions still hold unless noted otherwise below).

This document is the canonical reference for how Landing V2's Featured Ecosystem
section gets its data — provider mappings, caching, freshness, scoring, and
rendering. It supersedes no other architecture doc; `docs/API.md` remains the
per-provider reference, `docs/PROJECT_REGISTRY.md` remains the registry schema
reference, and `docs/ARCHITECTURE.md` remains the whole-app reference. This
file exists because Featured Intelligence spans all three and needed one place
that describes the full, currently-implemented pipeline end to end, along with
what's deliberately still illustrative and why.

## Architecture diagram

```
External Providers
  (CoinGecko, DefiLlama, DexScreener, Blockscout, GitHub, Snapshot, Base RPC)
        ↓
Provider Layer (lib/providers/*/client.ts + service.ts)
        ↓
Provider Cache + In-flight Deduplication (lib/providers/common/cache.ts)
        ↓
Normalized Provider Data (lib/providers/*/mapper.ts domain types)
        ↓
Project Intelligence matching (lib/intelligence/sources.ts: matchMarket, matchTvl, matchTrading, matchGithub, ...)
        ↓
Per-dimension normalization (lib/intelligence/dimensionNormalization.ts) — see §F
        ↓
computeRadarScore() (lib/intelligence/radarScore.ts) — LIVE, see §F
        ↓
Featured Intelligence Snapshot (lib/data/featuredIntelligenceSnapshot.ts)
        ↓
Next.js Static + ISR (app/page.tsx, revalidate = 180s)
        ↓
Landing V2 (components/landing/FeaturedEcosystem.tsx, FeaturedProjectTile.tsx)
```

## A. Provider layer

Seven real, integrated providers, each with its own `client.ts` (raw HTTP/
JSON-RPC), `mapper.ts` (raw → domain type, pure), and `service.ts` (cache +
rate-limit + `ProviderResult` wrapping): CoinGecko, DefiLlama, DexScreener,
Blockscout, GitHub, Snapshot, Base RPC. Featured Intelligence reuses this
layer as-is — no Featured-Intelligence-specific provider code exists, and
none should (PR-098.06/.08's explicit rule: don't create a duplicate provider
architecture).

## B. Provider cache

`lib/providers/common/cache.ts`'s `getOrSet(key, ttlMs, fn)` — an in-memory,
per-process TTL cache. Two properties this architecture depends on directly:

1. **Concurrent calls to the same key share one in-flight promise** (the
   module's own doc comment: "a burst of requests never triggers duplicate
   upstream calls"). Verified end-to-end (not just in isolation) by
   `tests/lib/data/featuredIntelligenceProviderLoad.test.ts`'s concurrent-
   request test: 20 simultaneous cold-cache snapshot builds still cost
   exactly one refresh's worth of real HTTP calls.
2. **Entries are never evicted on expiry, only overwritten on the next
   success** — the mechanism `withStaleFallback` depends on (§K).

## C. Provider batching

Every provider call `fetchProviderBulkData()` (`lib/intelligence/sources.ts`)
makes is already a bulk/batched call — one HTTP request for all Base-ecosystem
CoinGecko markets, one for every registry project's DexScreener token pairs,
one for the whole DefiLlama Base protocol list, etc. Featured Intelligence
calls this exact function once per snapshot regeneration and reuses its
result across every one of the 20 Featured projects — never one fetch per
project. 4 of the 7 Radar Score dimensions (§F) are computed entirely from
this shared bulk result: zero new provider calls.

**PR-099 exception, deliberate:** Developer Activity (GitHub), Governance
(Snapshot), and Security (Blockscout per-contract) have **no bulk/batched
provider endpoint** — GitHub repo stats, Snapshot proposals, and per-contract
verification are inherently per-project. `buildFeaturedIntelligenceSnapshot()`
therefore does call these three per project. This is **not** a repeat of
PR-098.06's GitHub-fanout bug (which fetched GitHub data via
`gatherProjectSources()` that was never consumed): these calls (a) are
consumed directly by Security/Developer Activity/Governance dimensions, (b)
are scoped to one shared snapshot regeneration — not per-visitor, since the
whole snapshot is `unstable_cache`-wrapped (§H) — and (c) are each
independently `getOrSet`-cached at their own provider TTL (GitHub 30min,
Snapshot 20min, Blockscout Security 45min, §J), so a regeneration inside the
same TTL window reuses the cached value rather than re-fetching. See §N for
the measured, real call-count impact.

## D. In-flight deduplication

Two layers, both real:

- **Provider layer** (§B): identical cache keys share one promise.
- **Next.js ISR**: the whole page only regenerates once per `revalidate`
  window regardless of concurrent visitor count (Next's own stale-while-
  revalidate semantics — confirmed for this specific single-instance Fly
  deployment in PR-098.05's audit of the local Next.js 16.3.4 docs).

## E. Project Intelligence

`lib/intelligence/sources.ts` + `merge.ts` is the real, shared Intelligence
Engine every live surface in the app uses (Explorer, Project Profile,
Compare, ...). Featured Intelligence reuses four of its exported matchers
directly — `matchMarket()`, `matchTvl()`, `matchTrading()`, `matchGithub()`
(the latter two exported for PR-099 following the exact export pattern
PR-098.06 established for the first two) — against the shared bulk result,
then `mergeMarket()`/`mergeTvl()`/`mergeTrading()`/`mergeGithub()` to produce
the same `Market`/`Tvl`/`Trading`/`GithubIntel` shapes the rest of the app
consumes. **Still deliberately does NOT call `gatherProjectSources()`**
(PR-098.06's fix, still in force): that function computes
`verifiedContract`/`network` unconditionally via paths this pipeline doesn't
need — Featured Intelligence builds its own `ProjectSources` from just the
matchers/fetches it actually uses (§F), never the whole bundle.

## F. Radar Score — LIVE (as of PR-099)

**PR-098.04–.09 status (historical):** `computeRadarScore()` was implemented
and tested but not wired — Featured Ecosystem showed `health.score`, a
hand-authored illustrative fixture value, under the "Radar Score" label.

**PR-099 wired the full live pipeline.** `computeRadarScore()` itself
(`lib/intelligence/radarScore.ts`) kept the same 7 weights (Market
Strength 20%, TVL/Liquidity 15%, Onchain Activity 15%, Developer Activity
15%, Governance 10%, Ecosystem Traction 10%, Security 15%) and the same
minimum-evidence gate (≥3 dimensions AND ≥40% weight coverage). What
PR-099 added is the layer that was missing: real per-dimension
normalization, in a new module, **`lib/intelligence/dimensionNormalization.ts`**:

| Dimension | Raw source | Normalization | Correlation guard |
|---|---|---|---|
| Market Strength | CoinGecko `marketCap`/`volume24hUsd` (raw `CoinMarket`, not the merged/fallback-resolved `Market` type) | 60% log(marketCap) + 40% linear(turnover ratio, capped 30%) | reads CoinGecko's own volume, never DexScreener's |
| TVL/Liquidity | DefiLlama **Base-specific `chainTvls.Base`** (PR-102 — see "PR-102: Base-specific TVL" below) | log-normalized (ceiling $5B, PR-102); **N/A (not 0)** outside `TVL_APPLICABLE_CATEGORIES` (dex/lending/derivatives/yield/stablecoin/bridge/rwa), and **N/A (never a silent fallback to global TVL)** when a protocol matches but has no real Base breakdown | — |
| Onchain Activity | DexScreener raw `trading.pools` sums (volume, buys+sells) | 60% log(volume) + 40% log(tx count) | reads raw pool sums, never `Trading.volume24hUsd` (which can fall back to CoinGecko) — avoids double-counting with Market Strength |
| Developer Activity | GitHub push/release recency + contributor breadth + **26-week commit cadence (PR-102)** (`matchGithub`) | weighted average of up to 4 components (PR-102 — see "PR-102: Developer Activity cadence" below); stars/forks never used | — |
| Governance | Snapshot proposals (per-project fetch, no bulk endpoint) | most-recent-proposal recency (50%) + log(voter count) (50%); N/A (not 0) with no `governance.snapshotSpace` | — |
| Ecosystem Traction | DexScreener distinct DEX venues + distinct chains | linear(venue count) + linear(chain count) | breadth, not volume — independent of Onchain Activity |
| Security | Blockscout per-contract verification (`contractDetailsByAddress`, per-project fetch) | verified / total across **every** `project.contracts` entry, never one arbitrary contract | 100% Blockscout-sourced, 0% overlap with DexScreener-sourced Onchain Activity |

Each normalizer returns `{ score: number | null, detail: string }` —
`score: null` means structurally not applicable (e.g. TVL for a non-DeFi
category) or no evidence, which `computeRadarScore()`'s own minimum-evidence
gate then handles — never coerced to `0`.

### PR-102: Model B — confidence as independent metadata, never a score discount

Prior to PR-102 ("Model A"), `computeRadarScore()` applied a confidence
**multiplier** to the renormalized quality score (0.7× at the coverage
floor, linear to 1.0× at full coverage) — a project with strong evidence on
only a few dimensions could never score as highly as one with equally
strong evidence spread across every dimension, even though the *quality*
of what was known was identical. That conflated two genuinely different
questions: "what does the evidence indicate" and "how much evidence is
there."

**Model B removes the multiplier entirely.** `RadarScoreResult.score` is
now the renormalized weighted-average quality score, full stop — no
multiplier, no proportional discount, no hidden penalty, no cap. Confidence
is reported as fully independent metadata:

```ts
type RadarScoreConfidence = { score: number; level: "high" | "medium" | "low" };
```

`confidence.score` reuses the *same* 0.7-floor-to-1.0 linear scale the old
multiplier used (unchanged math — only its use changed, from multiplying
into the score to standing alone as metadata). `confidence.level` reuses
this app's existing `ConfidenceLevel` vocabulary (already used elsewhere in
the UI) and is derived directly from `coveragePct` (not from the
already-transformed confidence score) using 0.9/0.6 thresholds — deriving
it from the narrower [70,100] confidence-score range instead would make
`"low"` mathematically unreachable for any project that actually clears the
minimum-evidence gate.

The minimum-evidence floor (≥3 dimensions, ≥40% coverage), N/A-distinct-
from-zero handling, and all 7 dimension weights are **unchanged** — Model B
only removes the multiplication step, nothing else in the methodology moved.
See `lib/intelligence/radarScore.ts`'s own module doc comments and the
"Model B guarantees" describe block in `tests/lib/intelligence/radarScore.test.ts`
for the full rationale and regression coverage.

### PR-102: Base-specific TVL

DefiLlama's bulk `/protocols` response carries a real, already-present
`chainTvls: Record<string, number>` breakdown per protocol. Prior to
PR-102, `lib/providers/defillama/mapper.ts` read only the protocol's
**global**, cross-chain `tvl` figure — for a multi-chain protocol like
Aave V3, that means a Base-focused product was scoring/displaying a
number (~$16.9B global, at time of writing) that had almost nothing to do
with the protocol's actual Base footprint (~$506M).

`Protocol` now carries both figures explicitly:

```ts
type Protocol = { globalTvlUsd: number; baseTvlUsd: number | null; ... };
```

`baseTvlUsd` reads `chainTvls.Base` (case-sensitive, exact key) and is
`null` — never a silent fallback to `globalTvlUsd` — when a protocol has no
real Base breakdown. This threads through the existing pipeline unchanged
in shape: `Tvl.tvlUsd` (the canonical, UI-facing figure everywhere) is now
`baseTvlUsd`; `Tvl.globalTvlUsd` is a new field carrying the global figure
as secondary context, never deleted, never presented as if it were the
Base figure. `mergeTvl()`'s `available` now requires a real, non-null
`baseTvlUsd` specifically. `aggregateParentProtocolTvl()` (for protocols
DefiLlama splits into sub-protocols, e.g. "Uniswap V3"/"Uniswap V4") sums
both figures the same way, null-safe on the Base side. The TVL
normalization ceiling was also recalibrated from $20B to $5B to match the
real, materially smaller scale of Base-specific TVL (vs. the old
global-TVL-scaled ceiling) — see `normalizeTvl()`'s own doc comment for the
census this was based on.

No provider rewrite, no new endpoint, no new caching layer — the
Base-specific figure was already present in the same response this
pipeline already fetched; only the mapper and the types it feeds needed to
change. See `tests/lib/providers/defillama/mapper.test.ts` and the "Base-
specific TVL is canonical" block in `tests/lib/intelligence/merge.test.ts`
for the full regression contract (never falls back to global, case-
sensitive key matching, single-chain-Base protocols show identical
figures, non-finite values never fabricated).

### PR-102: Developer Activity — 26-week sustained cadence

Developer Activity previously measured only *recency* (last push, last
release) and *breadth* (distinct contributors) — never *consistency* over
time. PR-102 adds a 4th signal, computed from the same already-fetched
`stats/commit_activity` weekly-bucket response (`lib/providers/github/
mapper.ts`'s `mapDeveloperCadence()`, +1 GitHub call per project with a
configured repo):

```
cadence = (active complete weeks in the last 26 / windowWeeks) × 100
```

A week counts as active on **any** real commit — a week with 1 commit and
a week with 200 commits both count as exactly one active week, deliberately
never rewarding raw volume. Two honesty rules, both enforced inside
`mapDeveloperCadence()` itself: the still-in-progress current week is
excluded (its bucket hasn't finished accumulating yet, so a real 0 there
isn't evidence of inactivity); `windowWeeks` reflects the actual available
history, capped at 26 but never padded up to 26 with phantom "missing =
inactive" weeks for a younger repo. Returns `null` (never a fabricated 0%)
when there's no complete-week evidence at all.

`normalizeDeveloperActivity()`'s weighted-average machinery (already
generic over a `components` array) needed no structural change — cadence
was added as a 4th conditional component, and the sub-weights were
rebalanced from the prior 3-component 50/20/30 split (push recency /
contributor breadth / release recency) to 40/25/20/15 (push recency /
cadence / contributor breadth / release recency). This is an internal
Developer Activity sub-weight choice, distinct from — and does not change —
the top-level 7 Radar Score dimension weights. See
`tests/lib/providers/github/mapper.test.ts` for the full regression suite
(26/26, partial, 0/26, single active week, current-week exclusion,
insufficient history, missing data, determinism).

`lib/data/featuredIntelligenceSnapshot.ts`'s `buildFeaturedIntelligenceSnapshot()`
now computes all 7 `DimensionResult`s per project, builds the
`RadarScoreDimensionInput[]`, and calls `computeRadarScore()` — the result is
attached to each `FeaturedIntelligenceEntry.radarScore` (§G). **No parallel
scoring system, no duplicate provider calls**: Market Strength/TVL/Onchain
Activity/Ecosystem Traction all read the existing shared bulk fetch (§C, zero
new calls); Developer Activity/Governance/Security are genuinely per-project
calls this pipeline didn't previously make (§C below explains why that's
architecturally justified, not a repeat of PR-098.06's GitHub-fanout waste).
As of PR-102, Developer Activity's own per-project GitHub cost is two calls,
not one (`fetchContributorCount` + the new `fetchCommitActivity`), each a
deliberate, evidenced addition for a materially independent signal — see
`tests/lib/data/featuredIntelligenceProviderLoad.test.ts`'s own cold-cache
call-count assertion for the real, measured total this brings the snapshot's
full per-refresh call count to.

**UI**: `FeaturedProjectTile.tsx` displays the live `radarScore.score` (via
`buildFeaturedProjectsWithSnapshot()`'s overlay onto `health.score`/`label`,
only when non-null — otherwise the illustrative fixture value is kept
unchanged) and its tooltip (`formatRadarScoreTooltip()`) now shows real
coverage/confidence/staleness instead of the PR-098.09 preview copy.
`radarScoreToHealthLabel()` reuses the existing 80/60/40 label boundaries
from `lib/intelligence/scoring.ts` — no new thresholds invented. This live
overlay is scoped to **Featured Ecosystem only** (an explicit PR-099 scoping
decision) — `health.score`/`aiRating`/scorecard consumers elsewhere in the
app (dashboard, Project Profile) are untouched by this PR.

## G. Featured Intelligence Snapshot

`lib/data/featuredIntelligenceSnapshot.ts` — `getFeaturedIntelligenceSnapshot(projectIds)`,
wrapped in `unstable_cache(..., { revalidate: 180 })`. Produces one
`FeaturedIntelligenceSnapshot` (`{ entries: FeaturedIntelligenceEntry[], generatedAt }`)
shared by every visitor within the revalidate window. Each entry carries:
`tvlUsd` (as of PR-102, the canonical **Base-specific** figure — see "PR-102:
Base-specific TVL" in §F; global TVL stays available as secondary context
via `Tvl.globalTvlUsd` upstream, not on this entry shape), `tokenChangePct24h`,
`available`, `stale`, `tvlFreshness`, `tokenChangeFreshness` (both
`SignalFreshness | null`, PR-098.07), and — as of PR-099 — `radarScore:
RadarScoreResult | null` (§F; `null` when insufficient evidence, never a
fabricated score).

`buildFeaturedProjectsWithSnapshot()` (`components/landing/
featuredProjects.ts`) merges this real snapshot onto the illustrative
`FEATURED_PROJECT_SPECS` fixture: real `tvlUsd`/`tokenChangePct24h` where
`available`, illustrative fallback otherwise (never "—" for a project with a
real mapping just because one regeneration cycle had a transient hiccup —
that's the stale-fallback contract, §K). As of PR-099, `health.score`/
`health.label` are overlaid with the live `radarScore.score`/
`radarScoreToHealthLabel(...)` **only when `radarScore` is non-null** —
otherwise the illustrative fixture value is kept unchanged, never
fabricated. `confidence` is untouched by this merge.

## H. Next.js Static + ISR

`app/page.tsx`: `export const revalidate = 180` (3 minutes, PR-098.07 —
retuned from PR-098.05's original 30 minutes to match the fastest freshness
class actually displayed, Token Price). Confirmed via `next build` output on
every PR-098.05/.07/.09 pass: `┌ ○ /    3m    1y` — static, never `ƒ
(Dynamic)`.

**Why this works** despite the provider layer's `fetchJsonOnce()`
unconditionally using `cache: "no-store"`: the entire snapshot computation is
wrapped in `unstable_cache()` (§B/D), which Next.js treats as one opaque,
independently-cached unit — the page's own render path never sees a raw
`no-store` fetch, so it never gets classified dynamic. Confirmed against this
app's actual installed Next.js 16.3.4 docs
(`node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`),
not assumed from training data (PR-098.05).

`cacheComponents`/`'use cache'` (Next 16's newer, recommended-but-optional
model) was deliberately NOT adopted — a whole-application rendering-model
migration, disproportionate to this one section's needs. `unstable_cache`
remains fully functional without it.

## I. Landing rendering

`app/page.tsx` (Server Component, `async`) → `getFeaturedIntelligenceSnapshot()`
→ `buildFeaturedProjectsWithSnapshot()` → passes the merged array as a prop
into `<FeaturedEcosystem projects=... freshnessById=... />` (Client
Component, for `useRouter()`/`framer-motion`) → `<FeaturedProjectTile
project=... freshness=... />` per tile. **No client-side provider calls, no
per-card fetch** — every tile receives its data as props from the one
server-side snapshot.

## J. Freshness

`lib/intelligence/freshnessPolicy.ts` — 8 named classes, each with a `ttlMs`
(fresh) and `staleWindowMs` (3× `ttlMs`, beyond which = hard-expired/
"unavailable"). See the Final Freshness Matrix below for the exact,
implemented values (verified directly from source, not assumed).

`resolveFreshness(fetchedAt, classId)` classifies an already-known timestamp;
`formatFreshnessLabel()` produces UI-safe copy ("Updated 4 min ago",
"Updated 20 min ago — may be outdated", "Not available") — never a TTL,
provider name, or cache-key detail. `deriveScoreFreshness()` exists and is
tested (worst-of-used-dimensions policy) for when Radar Score does go live
(§F) — currently unused in production for the same reason.

Deliberately a SEPARATE module from the pre-existing, already-shipped
`lib/intelligence/freshness.ts` (`computeFreshness`, which powers
`ProjectIntelligence.freshness` for the real dashboard) — not a rewrite of
it. That function has its own simpler, coarser, intentionally-provisional
global-threshold model; replacing it was out of this PR's scope (see that
file's own doc comment: "tune once real usage shows these need to be
tighter or looser" — a real, separate, future decision).

## K. Stale fallback

`lib/providers/common/utilities.ts`'s `withStaleFallback(provider, cacheKey, result)`
— on a failed live fetch, serves the last real, successfully-fetched value
for that exact key (honestly tagged `stale: true`) instead of surfacing
nothing. Verified present on every provider this pipeline touches:

- CoinGecko (`getBaseEcosystemMarkets`, `getMarketsByIds`) — PR-098.05
- DefiLlama (`getBaseProtocols`) — PR-098.06 (a real, previously-missing gap, fixed)
- DexScreener (`getBaseTrendingPairs`, `getPairsByTokenAddresses`) — PR-098.07 (previously absent, fixed)
- Blockscout, GitHub, Snapshot — all present

`matchTvl()`/`matchMarket()` (`lib/intelligence/sources.ts`) thread
`result.stale` into their returned `ProviderSlice`; `mergeMarket()` surfaces
it on `Market.stale`. The Featured Intelligence snapshot's own `stale` field
is `market.stale || tvlSlice.stale === true`.

## L. Provider failure

A per-project registry/matching exception is caught inside
`buildFeaturedIntelligenceSnapshot()`'s per-project loop and degrades that
one entry to `unavailable` — never throws, never fails the whole shared
snapshot for every visitor (verified: `tests/lib/data/
featuredIntelligenceProviderLoad.test.ts`'s partial-failure test). A
snapshot regeneration that fails entirely (e.g. every provider down at
once) leaves Next's ISR serving the last successfully-regenerated static
HTML (stale-while-revalidate, Next's own documented graceful-degradation
behavior) — never a broken page.

## M. Project mapping

`data/projects/seed/` is the canonical registry (PR-098.01). Current state,
verified directly against the filesystem:

| Project | Registry file | Coverage |
|---|---|---|
| Hydrex | `hydrex.ts` | Verified: CoinGecko, DexScreener, DefiLlama, Blockscout, GitHub, Snapshot |
| Spark | `spark.ts` | Verified partial: CoinGecko, DefiLlama, Blockscout, GitHub, Snapshot (no DexScreener) |
| Oku | `oku.ts` | GitHub-only by design — genuinely no token/TVL/contract exists |
| Superchain Eco | *(none)* | Confirmed not a project (a third-party directory site) — unavailable |
| Based Agents | *(none)* | No real, distinct project found — unavailable |

No provider ID, contract address, or mapping in this table was invented —
each was confirmed live against the provider's own API before being written
(PR-098.01's report has the full evidence trail).

## N. API-call behavior

Measured (not estimated) via a real mocked-`fetch` instrumentation harness,
`tests/lib/data/featuredIntelligenceProviderLoad.test.ts`. **Updated for
PR-099** — the historical PR-098 figure of 9 calls no longer applies, because
Developer Activity/Governance/Security (§F) genuinely require per-project
calls with no bulk endpoint. Per PR-098.06/.08's own instruction ("report the
actual number rather than forcing it to 9"), the real, measured number is
reported here:

- **Cold refresh**: 66 real HTTP calls total for the 20 Featured projects —
  breakdown: `{ coingecko: 2, dexscreener: 2, defillama: 1, blockscout: 27,
  base: 3, github: 22, snapshot: 9 }`. The pre-PR-099 shared-bulk portion
  (coingecko/dexscreener/defillama/base = 9 calls) is **unchanged**; the
  increase is entirely the new per-project Developer Activity/Governance/
  Security calls (§C), bounded by the 20 tracked projects and each project's
  actual registry coverage (e.g. projects with no `snapshotSpace` make no
  Snapshot call; Blockscout scales with each project's real contract count).
- **Warm refresh**: 0 additional calls (all 7 dimensions' sources share the
  same `getOrSet` cache as every other consumer, §B).
- **Repeated requests** (same snapshot, second call inside the revalidate
  window): 0 additional calls — proven via a dynamically-measured
  `coldCallCount` baseline, not a hardcoded number.
- **Concurrent requests** (20 simultaneous cold-cache snapshot builds):
  bounded at `≤ 1.5×` the cold-refresh count, not asserted as an exact
  match. This is a genuine, documented architectural property difference
  from the old single-upfront-batch design: many independent per-project
  async fetches race independently, and a given call can legitimately
  resolve as either a true in-flight-join or a fresh cache-hit depending on
  microtask timing — both are correct, neither re-hits the network, but the
  exact count is not deterministic run-to-run the way one shared batch's
  count was. The inequality assertion proves boundedness (never
  N × cold-count) without asserting a false-precision exact figure.

This is descriptive of the current implementation, not a target — the number
is allowed to change again if a future, legitimate architecture improvement
changes it; it should never be forced back to a specific figure for its own
sake.

## O. Scalability assumptions

Single Fly Machine, single Volume, no horizontal scaling (`fly.toml`'s own
documented tradeoff) — the provider cache and Next.js's file-system ISR
cache both work correctly and simply under this constraint with zero extra
infrastructure (no Redis, no external cache — confirmed not needed and not
added, per explicit instruction). 1, 100, 1,000, or 10,000 concurrent
visitors all share the exact same cached snapshot within a given 3-minute
window — visitor count never multiplies provider calls.

## P. Current limitations

1. Radar Score is now live for Featured Ecosystem only (§F) — dashboard/Project Profile `health`/`aiRating`/scorecard consumers still use their pre-existing (non-`computeRadarScore()`) logic, unchanged by PR-099 (an explicit scoping decision, not an oversight).
2. Oku, Superchain Eco, and Based Agents remain genuinely unavailable/partial by design, not a bug (§M) — their dimensions resolve to `null`/N/A per the minimum-evidence rule rather than a fabricated score.
3. The Data Cache backing `unstable_cache` isn't on the persistent Fly Volume — a Machine restart cold-starts one regeneration cycle (accepted tradeoff, not solved with new infra, per PR-098.05's report). PR-099 makes this cold-start cycle heavier (66 calls vs. 9, §N) but still a single shared regeneration, not per-visitor.
4. The pre-existing dashboard `ProjectIntelligence.freshness` (`lib/intelligence/freshness.ts`) still uses its own separate, coarser global-threshold model — not unified with `freshnessPolicy.ts` (deliberately out of scope, §J).
5. Radar Score freshness/staleness (`deriveScoreFreshness()`) is computed and attached to each `RadarScoreResult`, but Featured Ecosystem's tile UI does not yet render a dedicated staleness badge distinct from the tooltip text — a UI decision deferred as "only where UX supports it" per PR-099's own brief, not a defect.

## Q. Future work

- Extending live Radar Score beyond Featured Ecosystem to dashboard/Project Profile `health`/`aiRating` surfaces — a deliberate, separate product decision (§F), not part of PR-099.
- Unifying `lib/intelligence/freshness.ts` (dashboard) with `lib/intelligence/freshnessPolicy.ts` (Featured Intelligence) if a real product need arises.
- A manual product decision on whether Superchain Eco/Based Agents should be replaced with registry-backed projects.
- Disambiguating "Spark" if the intended project ever needs to change (PR-098.01's audit found the name ambiguous across entities; the mapped one — Sky/MakerDAO's Spark — was the best-evidenced real match).
- A globally-renamed "AI Rating"/"AI Grade" → "Radar Score" pass across the app, if the product decides Featured Ecosystem's live terminology should become the single, app-wide name (explicitly out of scope for PR-099, per its own brief).

---

## Final Freshness Matrix (verified against `lib/intelligence/freshnessPolicy.ts`)

| Signal | Provider | TTL (fresh) | Stale window | Refresh mechanism | Failure behavior | UI freshness |
|---|---|---|---|---|---|---|
| Token Price / Token 24H | CoinGecko | 2 min | 6 min | `getOrSet` + page ISR (3 min) | `withStaleFallback` → last real value, `stale: true` | "Updated X min ago" |
| DEX Liquidity & Volume | DexScreener | 5 min | 15 min | `getOrSet` | `withStaleFallback` | (not yet surfaced in Featured Intelligence UI — unused by this consumer today) |
| TVL | DefiLlama | 12 min | 36 min | `getOrSet` + page ISR | `withStaleFallback` | "Updated X min ago" |
| Onchain Activity | DexScreener (same cache entry as DEX Liquidity/Volume) | 5 min | 15 min | `getOrSet` | `withStaleFallback` | feeds Radar Score dimension input (§F) |
| Governance | Snapshot | 20 min | 60 min | `getOrSet` | `withStaleFallback` | feeds Radar Score dimension input (§F); N/A, not stale, when no `snapshotSpace` |
| Developer Activity | GitHub | 30 min | 90 min | `getOrSet` | `withStaleFallback` | feeds Radar Score dimension input (§F) |
| Security | Blockscout (contract verification, split from the live chain-stats ticker's own faster TTL) | 45 min | 135 min | `getOrSet` | `withStaleFallback` | feeds Radar Score dimension input (§F) |
| Radar Score | derived, not a live fetch | 10 min | 30 min | `deriveScoreFreshness()` — worst-of-used-dimensions | n/a — derived from dimension freshness, never fetched directly | **Live as of PR-099** — real tooltip via `formatRadarScoreTooltip()` (coverage/confidence/staleness) |

Note: the PR-098.08 task prompt's own "expected design direction" list stated
"Security: ~24hr" — this does not match the original PR-098.07 task's own
spec ("Security: 30-60min", which is what was actually implemented, at
45min). Trusted the original, more specific PR-098.07 instruction over the
later summary in PR-098.08's prompt; flagged here rather than silently
"corrected" without evidence either way actually changed.
