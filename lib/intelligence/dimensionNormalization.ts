/**
 * PR-099 — Live Radar Score & Intelligence Normalization.
 *
 * REAL PROVIDER DATA -> MEANINGFUL NORMALIZATION -> FAIR 0-100 DIMENSION
 * SCORES -> RADAR SCORE. This module owns the middle step: turning already
 * -merged, already-real provider data (`Market`/`Tvl`/`Trading`/
 * `RepoStats`/`SnapshotProposal[]`/verified-contract coverage) into the
 * seven 0-100 inputs `computeRadarScore()` (`lib/intelligence/radarScore.ts`)
 * expects. No I/O here — every function is pure, deterministic, and takes
 * already-fetched data, matching this engine's existing `merge.ts`/
 * `scorecard.ts` layering.
 *
 * ============================================================================
 * PHASE 2 DIMENSION TABLE (audited before implementation, per the PR-099 brief)
 * ============================================================================
 *
 * Dimension          | Raw Metrics                          | Provider    | Weight | Missing Data        | Stale Data                          | Correlation Risk
 * -------------------|---------------------------------------|-------------|--------|----------------------|--------------------------------------|------------------
 * Market Strength    | marketCapUsd, volume24hUsd (CoinGecko)| CoinGecko   | 20%    | N/A if no coingeckoId| inherits Market.stale (PR-098.02/.07)| Moderate w/ TVL (different providers/facts, accepted per PR-098.04)
 * TVL                     | tvlUsd                                | DefiLlama   | 15%    | N/A if category-inapplicable OR no defillamaSlug/match | inherits Tvl staleness | Moderate w/ Market Strength (accepted)
 * Onchain Activity    | DexScreener pool volume24hUsd, buys+sells (RAW pool sums, never the CoinGecko-fallback-resolved `trading.volume24hUsd`) | DexScreener | 15%    | N/A if no matched pools | inherits Trading staleness | Low w/ Ecosystem Traction (same provider, different fields: intensity vs breadth) |
 * Developer Activity | pushedAt, latestReleasePublishedAt (RepoStats) + contributors.count (ContributorCount) + developerCadence.cadencePct (26-week active-week ratio, PR-102; commitsLast7d/trendPct still deliberately excluded, see the function's own doc comment) | GitHub | 15% | N/A if no `project.github.repo` | inherits Github.stale | None |
 * Governance          | most-recent proposal `end`, `voterCount` | Snapshot | 10% | N/A if no `snapshotSpace` OR zero proposals | not tracked per-call today (see Freshness section below) | None |
 * Ecosystem Traction  | distinct DexScreener dexId count (breadth), `project.chains.length` | DexScreener + Registry | 10% | never fully N/A — `chains.length` is always known from the registry | inherits Trading staleness for the pool-breadth half | Low w/ Onchain Activity (breadth, not intensity) |
 * Security             | Blockscout per-contract verification coverage (verified / total registered contracts) | Blockscout | 15% | N/A if `project.contracts` is empty | per-contract lookups use the existing 45min "Security" freshness class (PR-098.07) | None (independent of Onchain Activity — PR-098.04's fix, re-verified here) |
 *
 * See each function's own doc comment below for the full 13-point definition
 * (measures/matters/metrics/provider/unit/freshness/formula/outliers/
 * missing/stale/correlation/min-evidence/tests) the PR-099 brief requires.
 */

import type { Tvl, Trading, GithubIntel } from "@/lib/intelligence/types";
import type { CoinMarket } from "@/lib/providers/coingecko/service";
import type { SnapshotProposal } from "@/lib/providers/snapshot/service";
import type { ContractDetail } from "@/lib/providers/blockscout/mapper";
import type { ContributorCount } from "@/lib/providers/github/service";
import type { Project } from "@/data/projects/types";

export type DimensionResult = {
  /** 0-100, or `null` when this dimension is not applicable / has no evidence — never a guessed/defaulted value. */
  score: number | null;
  /** One-line, reproducible trace of exactly how `score` was derived (or why it's `null`) — every number here is arithmetic over the real inputs, never LLM-invented. */
  detail: string;
};

const NOT_APPLICABLE = (reason: string): DimensionResult => ({ score: null, detail: reason });

// ---------------------------------------------------------------------------
// Shared normalization primitives
// ---------------------------------------------------------------------------

/**
 * Logarithmic 0-100 normalization between `floor` and `ceiling` — the
 * chosen method for every heavily right-skewed crypto metric here (market
 * cap, TVL, volume, transaction counts). Selected over naive
 * `value / max` because crypto metrics span many orders of magnitude
 * (a $100K project and a $10B project can both be real, legitimate,
 * Base-ecosystem projects) — linear scaling against the largest observed
 * value would make every project except the single biggest one read as
 * near-zero. Log-scale instead means "10x bigger" always earns the same
 * fixed number of extra points, matching how these metrics actually differ
 * qualitatively. Deterministic, reproducible, and inherently outlier-
 * resistant: no value can ever exceed 100 or drop below 0, so one whale
 * project can never distort another's score.
 */
function logNormalize(value: number, floor: number, ceiling: number): number {
  if (!Number.isFinite(value) || value <= floor) return 0;
  if (value >= ceiling) return 100;
  const logFloor = Math.log10(floor);
  const logCeiling = Math.log10(ceiling);
  const logValue = Math.log10(value);
  return ((logValue - logFloor) / (logCeiling - logFloor)) * 100;
}

/** Plain linear 0-100 normalization, clamped — used only for metrics that are NOT heavily skewed (small integer counts: distinct venues, chains). */
function linearNormalize(value: number, floor: number, ceiling: number): number {
  if (!Number.isFinite(value) || value <= floor) return 0;
  if (value >= ceiling) return 100;
  return ((value - floor) / (ceiling - floor)) * 100;
}

/**
 * Recency decay: 100 within `fullCreditDays`, decaying linearly to 0 by
 * `zeroCreditDays`, `null` when there's no timestamp at all. Used for
 * "how recently did real activity happen" (Developer Activity, Governance)
 * — deliberately linear (not logarithmic): recency is a bounded, roughly-
 * uniform-feeling quantity (the difference between "3 days ago" and "10
 * days ago" matters about as much as "60 days ago" vs "67 days ago"),
 * unlike market cap/TVL/volume's genuine power-law spread.
 */
function recencyScore(timestampIso: string | null, fullCreditDays: number, zeroCreditDays: number, now: number = Date.now()): number | null {
  if (!timestampIso) return null;
  const fetchedAtMs = new Date(timestampIso).getTime();
  if (Number.isNaN(fetchedAtMs)) return null;
  const ageDays = Math.max(0, (now - fetchedAtMs) / 86_400_000);
  if (ageDays <= fullCreditDays) return 100;
  if (ageDays >= zeroCreditDays) return 0;
  return 100 * (1 - (ageDays - fullCreditDays) / (zeroCreditDays - fullCreditDays));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// ---------------------------------------------------------------------------
// Dimension 1 — Market Strength (CoinGecko)
// ---------------------------------------------------------------------------

/**
 * 1. Measures: how established and how healthily-traded this project's own
 *    token is — NOT simply "how big."
 * 2. Matters: a large but dead (never-traded) token is a red flag, not a
 *    strength; a smaller but actively-traded one is real evidence of
 *    market trust.
 * 3. Raw metrics: `marketCapUsd`, `volume24hUsd` (both CoinGecko). Read from
 *    the raw `CoinMarket` slice directly, NOT the merged `Market` type —
 *    `mergeMarket()` deliberately doesn't carry CoinGecko's own
 *    `volume24hUsd` through to `Market` (only `Trading.volume24hUsd`
 *    exists there, DexScreener-first with a CoinGecko fallback) — using
 *    that field here would risk silently reading DexScreener's number
 *    through the fallback chain, exactly the Market-Strength/Onchain-
 *    Activity correlation this design avoids (see Onchain Activity's own
 *    doc comment below for the mirror-image version of this same care).
 * 4. Provider: CoinGecko only (PR-098.02's established sole source).
 * 5. Unit: USD.
 * 6. Freshness: `market.stale` (PR-098.07's "Token Price" class, 2min/6min).
 * 7. Formula: 60% log-normalized market cap ($100K-$50B) + 40% linear-
 *    normalized 24h turnover ratio (volume/marketCap, capped at 30%/day —
 *    beyond that is diminishing evidence of health, not more of it).
 *    Turnover ratio was chosen over raw/log volume specifically BECAUSE it
 *    self-normalizes for size: a $10M token with $500K volume and a $1B
 *    token with $50M volume have the identical, genuinely comparable 5%
 *    turnover — using raw volume would just re-reward being big a second
 *    time, exactly what the brief warned against.
 * 8. Outliers: both components are bounded (log cap, ratio cap) — no
 *    single whale project can exceed 100 or distort another's score.
 * 9. Missing data: `null` (N/A) when `market.available` is false or
 *    `marketCapUsd` is null/non-positive.
 * 10. Stale data: score is still computed from the (possibly stale) last-
 *     known values — staleness is surfaced separately via `market.stale`,
 *     never silently hidden, never blanked to N/A just for being old.
 * 11. Correlation risk: moderate with TVL (economically related
 *     for DeFi projects) — accepted, not eliminated, per PR-098.04's own
 *     audit (different providers, different real facts).
 * 12. Minimum evidence: this dimension alone needs both fields non-null;
 *     the cross-dimension 3-dimension/40%-weight floor is enforced by
 *     `computeRadarScore()`, unchanged.
 * 13. Test strategy: extreme market cap (near $50B ceiling), tiny market
 *     cap (near $100K floor), zero volume, missing market data.
 */
export function normalizeMarketStrength(rawMarket: CoinMarket | null): DimensionResult {
  if (!rawMarket || !Number.isFinite(rawMarket.marketCapUsd) || rawMarket.marketCapUsd <= 0) {
    return NOT_APPLICABLE("No verified CoinGecko market data for this project's token.");
  }
  const capScore = logNormalize(rawMarket.marketCapUsd, 100_000, 50_000_000_000);
  const volume = Number.isFinite(rawMarket.volume24hUsd) ? rawMarket.volume24hUsd : 0;
  const turnoverRatio = volume > 0 ? volume / rawMarket.marketCapUsd : 0;
  const turnoverScore = linearNormalize(Math.min(turnoverRatio, 0.3), 0, 0.3);
  const score = round1(capScore * 0.6 + turnoverScore * 0.4);
  return {
    score,
    detail: `Market cap $${Math.round(rawMarket.marketCapUsd).toLocaleString()} (${round1(capScore)}/100 log-scaled) + ${round1(turnoverRatio * 100)}% 24h turnover (${round1(turnoverScore)}/100) = ${score}.`,
  };
}

// ---------------------------------------------------------------------------
// Dimension 2 — TVL (DefiLlama)
// ---------------------------------------------------------------------------

/**
 * MASTER HARDENING PASS — Concern 5 audit: this dimension has been
 * publicly/internally labeled "TVL / Liquidity" since PR-099, but the
 * implementation below has only ever read one raw metric — DefiLlama's
 * `tvlUsd` — and never touched any actual liquidity metric (e.g.
 * DexScreener's per-pool `liquidityUsd`, which IS fetched elsewhere in this
 * pipeline for Onchain Activity/Ecosystem Traction, just never for this
 * dimension). That makes the "/ Liquidity" half of the name inaccurate —
 * corrected here to plain "TVL" (this function/section/table entry; the
 * internal `tvlLiquidity` identifier in `radarScore.ts`'s
 * `RadarScoreDimensionId` union is left unchanged, since renaming a
 * machine-readable enum key would ripple through every file that
 * references it — including every test — for a key nothing renders
 * verbatim as a user-facing label today; confirmed by inspecting
 * `formatRadarScoreTooltip()` and every component that reads
 * `RadarScoreResult`, none of which prints a per-dimension name).
 *
 * Considered, and rejected, adding real liquidity data instead of just
 * renaming: DexScreener's pool `liquidityUsd` IS a real, already-fetched,
 * currently-unused field. But for exactly the category of projects this
 * dimension applies to (DEX, lending, derivatives, yield, stablecoin,
 * bridge, RWA), DefiLlama's own TVL figure for a DEX protocol specifically
 * IS materially the sum of that protocol's own pool liquidity — the two
 * numbers aren't independent evidence, they're two providers' measurements
 * of close to the same underlying fact. Blending them in would be a real
 * double-count, not new information, for the applicable-category case that
 * matters most. Plain "TVL" (Option A) is the honest choice; DexScreener
 * liquidity remains genuinely available future work if a provider is ever
 * found whose liquidity figure is independent of its own TVL reporting.
 *
 * TVL is structurally meaningful only for protocols whose product IS
 * locked/deposited capital — DEX, lending, derivatives, yield,
 * stablecoin, bridge, real-world-asset protocols. For a social network, a
 * naming service, developer tooling, or an NFT platform, "how much money is
 * locked in this contract" isn't a real question — there's nothing to
 * lock. Applying a 0 there would be a fabricated penalty for a category
 * mismatch, not real evidence of weakness — exactly what the brief
 * explicitly forbids ("Do NOT treat N/A as zero"). This same category gate
 * is why an aggregator/interface like Oku (PR-101; category corrected to
 * "infrastructure", not in this set) stays honestly N/A here — TVL is
 * capital Oku's own users deposit with Oku, which never happens; the real
 * capital sits with the underlying protocols Oku routes trades through,
 * and attributing that to Oku would misrepresent whose balance sheet it is.
 */
const TVL_APPLICABLE_CATEGORIES = new Set(["dex", "lending", "derivatives", "yield", "stablecoin", "bridge", "rwa"]);

/**
 * 1. Measures: real capital users have deposited/locked with this protocol.
 * 2. Matters: for capital-holding protocols, TVL is a direct measure of
 *    user trust with real money, not just speculative token interest.
 * 3. Raw metric: `tvlUsd` (DefiLlama) — TVL only; see the audit note above
 *    for why liquidity was deliberately not added. PR-102 — this is now
 *    the protocol's BASE-SPECIFIC TVL (`Tvl.tvlUsd`, sourced from
 *    DefiLlama's real `chainTvls.Base`), never its global cross-chain
 *    total — see `lib/providers/defillama/mapper.ts`'s `Protocol` type for
 *    the full rationale and the live-verified magnitude of the difference
 *    (Aave V3: ~$16.9B global vs. ~$506M on Base).
 * 4. Provider: DefiLlama only.
 * 5. Unit: USD.
 * 6. Freshness: `tvlSlice.stale` (PR-098.07's "TVL" class, 12min/36min).
 * 7. Formula: log-normalized TVL, $100K-$5B. PR-102 — ceiling lowered from
 *    $20B (calibrated against GLOBAL protocol TVL) to $5B, evidence-based:
 *    a real census of all 744 Base-chain-included DefiLlama protocols with
 *    positive Base-specific TVL found a real max of ~$3.93B and a p99 of
 *    ~$265M — the old $20B ceiling was calibrated for a value domain
 *    (global TVL) this dimension no longer reads, and would have silently
 *    compressed every real Base-specific value into the bottom fraction of
 *    the 0-100 scale had it been left unchanged. $5B leaves real headroom
 *    above the observed max without being so large it flattens the
 *    dimension the same way the old ceiling did.
 * 8. Outliers: log-capped, same reasoning as Market Strength.
 * 9. Missing data: `null` (N/A) — two distinct honest reasons, both
 *    surfaced in `detail`: (a) the project's own category makes TVL
 *    structurally inapplicable, or (b) TVL is applicable but no real
 *    DefiLlama match/value exists yet.
 * 10. Stale data: same policy as Market Strength — compute from last-known, never hide.
 * 11. Correlation risk: moderate with Market Strength (accepted, PR-098.04).
 * 12. Minimum evidence: cross-dimension floor unchanged.
 * 13. Test strategy: DEX with real TVL, social project (structural N/A),
 *     DeFi project with no real DefiLlama match (data N/A, different reason),
 *     aggregator/interface (Oku) — category-excluded, N/A, never the
 *     underlying protocols' TVL attributed to it.
 */
export function normalizeTvl(project: Project, tvl: Tvl): DimensionResult {
  const applicable = project.categories.some((c) => TVL_APPLICABLE_CATEGORIES.has(c));
  if (!applicable) {
    return NOT_APPLICABLE(`TVL is not structurally applicable to this project's category (${project.categories.join(", ") || "uncategorized"}).`);
  }
  if (!tvl.available || tvl.tvlUsd === null || tvl.tvlUsd <= 0) {
    return NOT_APPLICABLE("TVL is applicable to this category, but no real Base-specific DefiLlama data was found for this project (a global figure alone is never substituted).");
  }
  const score = round1(logNormalize(tvl.tvlUsd, 100_000, 5_000_000_000));
  return { score, detail: `Base TVL $${Math.round(tvl.tvlUsd).toLocaleString()}, log-scaled = ${score}.` };
}

// ---------------------------------------------------------------------------
// Dimension 3 — Onchain Activity (DexScreener, INTENSITY)
// ---------------------------------------------------------------------------

/**
 * 1. Measures: real, current trading intensity on Base — how much is
 *    actually happening right now, distinct from how much capital sits
 *    parked (TVL) or how many venues exist (Ecosystem Traction, below).
 * 2. Matters: a protocol can have real TVL/token value but genuinely no
 *    current activity (a stale, abandoned deployment) — intensity is
 *    independent evidence.
 * 3. Raw metrics: DexScreener pool `volume24hUsd` (summed across matched
 *    pools) and `buys24h`+`sells24h` (summed transaction count) — read
 *    directly from `trading.pools`, deliberately NOT `trading.volume24hUsd`
 *    (which can silently fall back to CoinGecko's exchange-wide volume —
 *    PR-050's own resolution chain — which would leak Market Strength's
 *    same CoinGecko signal back into a dimension meant to be DexScreener-
 *    only; a real correlation risk this implementation specifically avoids).
 * 4. Provider: DexScreener only.
 * 5. Unit: USD (volume), count (transactions).
 * 6. Freshness: `trading` staleness (PR-098.07's "DEX Liquidity & Volume"/
 *    "Onchain Activity" class, both 5min/15min, same real cache entry).
 * 7. Formula: 60% log-normalized DEX volume ($1K-$50M/day) + 40% log-
 *    normalized transaction count (5-50,000/day).
 * 8. Outliers: both log-capped.
 * 9. Missing data: `null` (N/A) when no DexScreener pools matched at all.
 * 10. Stale data: computed from last-known pools, staleness surfaced separately.
 * 11. Correlation risk: previously HIGH with Security (both depended on
 *     Blockscout, PR-098.04's core audit finding) — resolved by this
 *     dimension being 100% DexScreener-sourced; Security below is 100%
 *     Blockscout-sourced; no shared raw evidence between them, re-verified
 *     here. Low correlation with Ecosystem Traction (same provider,
 *     genuinely different fields — intensity vs. breadth).
 * 12. Minimum evidence: cross-dimension floor unchanged.
 * 13. Test strategy: DEX with real active pools, project with zero
 *     matched pools (N/A), extreme volume outlier, near-zero volume.
 */
export function normalizeOnchainActivity(trading: Trading): DimensionResult {
  if (!trading.available || trading.pools.length === 0) {
    return NOT_APPLICABLE("No matched DexScreener pools for this project's token.");
  }
  const rawVolume = trading.pools.reduce((sum, pool) => sum + (pool.volume24hUsd ?? 0), 0);
  const txCount = trading.buys24h !== null && trading.sells24h !== null ? trading.buys24h + trading.sells24h : 0;
  const volumeScore = logNormalize(rawVolume, 1_000, 50_000_000);
  const txScore = logNormalize(txCount, 5, 50_000);
  const score = round1(volumeScore * 0.6 + txScore * 0.4);
  return {
    score,
    detail: `Raw DexScreener 24h volume $${Math.round(rawVolume).toLocaleString()} (${round1(volumeScore)}/100) + ${txCount} transactions (${round1(txScore)}/100) = ${score}.`,
  };
}

// ---------------------------------------------------------------------------
// Dimension 4 — Developer Activity (GitHub)
// ---------------------------------------------------------------------------

/**
 * MASTER HARDENING PASS — Concern 3 audit (before any change): the V1
 * formula below used exactly two signals, both timestamp-recency (push,
 * release). Investigated what else `lib/providers/github/` already
 * legitimately exposes, since the brief requires auditing real available
 * data before inventing or importing anything new:
 *
 * - `getCommitActivity()` → `CommitActivity` (`commitsLast7d`/`commitsLast90d`/
 *   `trendPct`) — REAL, already used elsewhere in the app. NOT adopted here:
 *   (a) it's raw commit VOLUME, and the brief explicitly warns against
 *   rewarding activity for being high; (b) it's substantially redundant
 *   with push recency — a repo that pushed in the last 7 days will almost
 *   always show `commitsLast7d > 0` too, so adding it risks double-counting
 *   the same underlying "was this touched recently" fact under a different
 *   name rather than adding independent evidence.
 * - `getContributorCount()` → `ContributorCount` (`count`, capped at
 *   GitHub's 100-per-page limit) — REAL, independently informative: how
 *   many distinct people maintain this codebase is a genuinely different
 *   axis from "when was it last touched" (bus-factor / community breadth,
 *   not recency). ADOPTED below as a third component, gated behind the
 *   same `project.github.repo` condition the existing calls already use
 *   (no new project ever pays for this that wasn't already paying for
 *   repo+release calls). Real, measured cost: +1 GitHub call per project
 *   with a configured repo (documented in the PR report's before/after
 *   table) — a deliberate, evidenced tradeoff, not blind cost creep.
 * - Pull request / issue activity: GitHub's REST API exposes these, but
 *   this codebase's GitHub client (`lib/providers/github/client.ts`) has no
 *   existing fetch for either, and issue counts in particular are a poor
 *   health signal on their own (a popular, healthy repo often has MORE open
 *   issues, not fewer). Not added — would be inventing new provider
 *   surface area for a signal that's ambiguous even if fetched.
 * - `stars`/`forks`: available but deliberately still excluded, unchanged
 *   from V1 — historical popularity, not current maintenance health.
 *
 * PR-102 — added a FOURTH component: 26-week sustained development cadence
 * (`GithubIntel.developerCadence`, `activeWeeks/windowWeeks × 100` — see
 * `github/mapper.ts`'s `mapDeveloperCadence`). This is the "consistently
 * maintained vs. one recent burst" distinction push-recency alone cannot
 * make: a repo pushed yesterday after 6 months of silence and a repo
 * pushed yesterday after weekly commits all year both read as
 * `pushRecency = 100`, but have very different cadence. Deliberately
 * NEVER volume-based (counts a week active on ANY commit, whether 1 or
 * 200 — a week with a huge commit burst scores identically to a week with
 * a single real commit), so it can't be gamed the way a raw-commit-count
 * signal could, and doesn't reward activity for being high, only for
 * being consistent. Real, measured cost: +1 GitHub call per project with
 * a configured repo (the same `getCommitActivity()` endpoint already
 * fetches the raw weekly buckets `mapDeveloperCadence` reads — no
 * additional endpoint, just one more caller of an existing fetch).
 *
 * 1. Measures: how recently and actively this project's real codebase is
 *    being maintained, how many distinct people maintain it, AND how
 *    consistently (not just recently) development has continued.
 * 2. Matters: an abandoned repo is a real risk signal regardless of how
 *    popular it once was; a single-maintainer repo carries real bus-factor
 *    risk a recency-only signal can't see; a repo that goes quiet for
 *    months between bursts is a different, real risk profile from one
 *    maintained every week, even if both happened to push code yesterday.
 * 3. Raw metrics: `pushedAt`, `latestReleasePublishedAt` (RepoStats) +
 *    `contributors.count` (ContributorCount, page-1-capped at 100) +
 *    `developerCadence.cadencePct` (26 complete weekly commit-activity
 *    buckets, PR-102).
 * 4. Provider: GitHub only.
 * 5. Unit: days since timestamp (recency components); a capped headcount (breadth component); a percentage of active weeks (cadence component).
 * 6. Freshness: `github.stale` (PR-098.07's "Developer Activity" class, 30min/90min) for every component — contributor count and cadence are fetched on the same cadence, not independently tracked.
 * 7. Formula: a weighted average over whichever of four components are
 *    available, weights redistributed proportionally when one is missing
 *    (never a guessed value in its place) — push recency (full credit
 *    within 7 days, decaying to 0 by 180 days) at base weight 40%, 26-week
 *    cadence at 25%, contributor breadth (log-normalized count, 1-50) at
 *    20%, release recency (full credit within 30 days, decaying to 0 by
 *    365 days) at 15%. Push recency is the one component that's never
 *    missing once this function runs at all (gated on `github.pushedAt`
 *    below), so it always carries at least its base weight and picks up
 *    any weight the other three lose. These specific weights were chosen
 *    (not measured/tuned against a target distribution) to keep push
 *    recency dominant while giving the new cadence signal real influence
 *    matching PR-102's emphasis on it — see the PR-102 report's measured
 *    before/after impact across the registry, not a blind theoretical pick.
 * 8. Outliers: every component is independently bounded (recency clamps
 *    0-100; log-normalized contributor count clamps 0-100 and treats "10x
 *    more contributors" as a fixed point gain, so one huge, well-staffed
 *    repo can't make every other repo read near-zero by comparison;
 *    cadence is a plain 0-100 percentage, inherently bounded).
 * 9. Missing data: `null` (N/A) for the whole dimension only when the
 *    project has no configured `github.repo` at all, or the live GitHub
 *    match itself is unavailable — unchanged from V1. A missing/failed
 *    contributor-count or cadence fetch alone does NOT force the dimension
 *    to N/A; each just drops out of the weighted average (proportional
 *    redistribution).
 * 10. Stale data: computed from last-known RepoStats, staleness surfaced separately.
 * 11. Correlation risk: none identified — independent of every other dimension. Contributor count and cadence are both GitHub-sourced but read genuinely distinct raw fields (headcount vs. weekly activity buckets), distinct from Security's Blockscout-only evidence and Onchain Activity's DexScreener-only evidence.
 * 12. Minimum evidence: cross-dimension floor unchanged.
 * 13. Test strategy: pushed today (no contributors/cadence data), pushed
 *     200+ days ago, no release ever, GitHub unavailable, all four
 *     components present, cadence missing/insufficient history (degrades
 *     gracefully), 26/26 active weeks, 0/26 active weeks, partial cadence,
 *     contributor count outlier (100+, capped), contributor count of 1.
 */
export function normalizeDeveloperActivity(github: GithubIntel, contributors: ContributorCount | null = null): DimensionResult {
  if (!github.available || !github.pushedAt) {
    return NOT_APPLICABLE("No verified GitHub repository (or no real activity data) configured for this project.");
  }
  const pushRecency = recencyScore(github.pushedAt, 7, 180) ?? 0;
  const releaseRecency = recencyScore(github.latestReleasePublishedAt, 30, 365);
  const breadthScore = contributors ? logNormalize(contributors.count, 1, 50) : null;
  const cadenceScore = github.developerCadence ? github.developerCadence.cadencePct : null;

  const components: Array<{ label: string; score: number; weight: number }> = [{ label: "push recency", score: pushRecency, weight: 0.4 }];
  if (cadenceScore !== null) components.push({ label: "26-week cadence", score: cadenceScore, weight: 0.25 });
  if (breadthScore !== null) components.push({ label: "contributor breadth", score: breadthScore, weight: 0.2 });
  if (releaseRecency !== null) components.push({ label: "release recency", score: releaseRecency, weight: 0.15 });

  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const score = round1(components.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight);
  const detail = components.map((c) => `${c.label} ${round1(c.score)}/100 (weight ${Math.round((c.weight / totalWeight) * 100)}%)`).join(" + ");
  return { score, detail: `${detail} = ${score}.` };
}

// ---------------------------------------------------------------------------
// Dimension 5 — Governance (Snapshot)
// ---------------------------------------------------------------------------

/**
 * 1. Measures: how recently and how broadly this project's real governance
 *    process is being used.
 * 2. Matters: active, well-attended governance is real evidence of a
 *    healthy, decentralizing community — but its ABSENCE is not a failure
 *    (many legitimate projects have no token-holder governance at all, or
 *    govern on-chain via a different mechanism Snapshot doesn't track —
 *    see the registry's own `governanceType: "on-chain"` convention).
 * 3. Raw metrics: most recent proposal's `end` timestamp, that proposal's `voterCount`.
 * 4. Provider: Snapshot only.
 * 5. Unit: days (recency), count (voters).
 * 6. Freshness: PR-098.07's "Governance" class, 20min/60min.
 * 7. Formula: 50% recency of the most recent proposal (full credit within
 *    30 days, decaying to 0 by 365 days — governance moves far slower than
 *    price/dev activity, deliberately generous windows) + 50% log-
 *    normalized voter count (5-2,000 voters).
 * 8. Outliers: both bounded.
 * 9. Missing data: `null` (N/A) — never a zero — when no `snapshotSpace`
 *    is configured, or a real space exists but has never had a proposal.
 * 10. Stale data: computed from the last-known proposal list, staleness
 *     surfaced separately (see the freshness note below).
 * 11. Correlation risk: none identified.
 * 12. Minimum evidence: cross-dimension floor unchanged.
 * 13. Test strategy: active recent proposal with high turnout, old
 *     proposal, zero proposals ever, no snapshot space at all.
 */
export function normalizeGovernance(project: Project, proposals: SnapshotProposal[] | null): DimensionResult {
  if (!project.governance?.snapshotSpace) {
    return NOT_APPLICABLE("No verified Snapshot governance space configured for this project.");
  }
  if (!proposals || proposals.length === 0) {
    return NOT_APPLICABLE("A Snapshot space is configured, but it has no proposals on record.");
  }
  const mostRecent = [...proposals].sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())[0];
  const recency = recencyScore(mostRecent.end, 30, 365) ?? 0;
  const voterCount = mostRecent.voterCount ?? 0;
  const participationScore = logNormalize(voterCount, 5, 2000);
  const score = round1(recency * 0.5 + participationScore * 0.5);
  return {
    score,
    detail: `Most recent proposal ended ${mostRecent.end} (recency ${round1(recency)}/100), ${voterCount} voters (${round1(participationScore)}/100) = ${score}.`,
  };
}

// ---------------------------------------------------------------------------
// Dimension 6 — Ecosystem Traction (DexScreener breadth + registry chains)
// ---------------------------------------------------------------------------

/**
 * MASTER HARDENING PASS — Concern 4 audit (before any change): re-verified
 * against the real registry (`data/projects/seed/*.ts`, all 23 entries) —
 * 8 of 23 (aerodrome-finance, basenames, clanker, hydrex, moonwell, oku,
 * seamless-protocol, virtuals-protocol) have `chains.length === 1`. The old
 * "no pools → chains.length alone" fallback fed `chains.length` into
 * `linearNormalize(value, 1, 6)`, which returns exactly 0 whenever
 * `value <= floor` — so EVERY one of those 8 projects, whenever they also
 * have no matched DexScreener pools in a given cycle, was silently floored
 * to Ecosystem Traction = 0. This is not Oku-specific (Oku is simply the
 * project PR-101 already proved will ALWAYS hit this path, since it has no
 * token and therefore never matches pools) — it's a general flaw: "1
 * chain" is this Base-focused registry's universal DEFAULT (every tracked
 * project is at least on Base), not evidence of narrow reach, yet the old
 * formula scored it as if it were real, differentiating evidence of the
 * worst possible breadth. That is exactly the "N/A treated as zero"
 * anti-pattern the brief prohibits, just reached through a floor-of-a-
 * linear-range rather than an explicit branch.
 *
 * Fix: `chains.length` only counts as real evidence once it's ABOVE the
 * registry's universal floor (>1) — i.e., a genuinely multi-chain
 * deployment (Aave, LayerZero, Safe, Pyth, USD Coin, ...), which real is
 * meaningful breadth evidence regardless of project category, no new
 * taxonomy concept needed. A project with neither matched pools NOR more
 * than one chain has no real breadth evidence at all and is now honestly
 * N/A, not scored at the floor. This is deliberately category-agnostic —
 * it falls directly out of what "1 chain" structurally means for every
 * entry in this specific registry, not a special case carved out for
 * aggregators/interfaces (a broader, correctly-generalized fix, per the
 * brief's own "smallest architecture-compatible solution" instruction).
 *
 * 1. Measures: BREADTH — how many distinct real venues/chains this project
 *    has genuine presence on — deliberately NOT a repeat of Onchain
 *    Activity's volume/transaction INTENSITY.
 * 2. Matters: a project trading on many independent DEXs, or deployed
 *    across several real chains, has broader real ecosystem integration
 *    than one confined to a single pool on a single chain, independent of
 *    how much volume any one of them currently does.
 * 3. Raw metrics: count of distinct DexScreener `dexId` values across
 *    matched pools; `project.chains.length` (registry).
 * 4. Provider: DexScreener + the registry itself (not a live provider call
 *    — this data is already loaded for every project regardless).
 * 5. Unit: count.
 * 6. Freshness: the DexScreener half inherits `trading` staleness; the
 *    registry half is static (chains don't change moment-to-moment).
 * 7. Formula: when real pool data exists, 60% linear-normalized distinct-
 *    venue count (1-8 venues) + 40% linear-normalized chain count (1-6
 *    chains, only when >1 — see the audit note above; a single chain
 *    contributes nothing to this half rather than a fabricated non-zero
 *    reading, matching the honest floor-vs-N/A distinction). When no pool
 *    data exists: `chains.length` alone carries 100% weight IF it's >1
 *    (real multi-chain evidence); otherwise the whole dimension is N/A.
 * 8. Outliers: both linear-capped (small integer counts, not power-law
 *    distributed the way volume/market-cap are, so linear — not log — is
 *    the defensible choice here).
 * 9. Missing data: `null` (N/A) when there are no matched pools AND
 *    `chains.length <= 1` — this registry's universal floor, not real
 *    differentiating evidence. Real (non-N/A) whenever EITHER pools exist
 *    OR the project is verifiably multi-chain.
 * 10. Stale data: the pool-breadth half inherits `trading` staleness when present.
 * 11. Correlation risk: low with Onchain Activity (same provider, distinct
 *     fields — breadth vs. intensity, verified not to share a raw number).
 * 12. Minimum evidence: cross-dimension floor unchanged.
 * 13. Test strategy: project on many DEXs/chains, project on exactly one
 *     pool/chain, project with zero matched pools and genuinely multi-chain
 *     (registry-chains-only, real score), project with zero pools and
 *     exactly one chain (N/A — the Oku case, explicitly tested), project
 *     with pools but only one chain (venue-only contribution).
 */
export function normalizeEcosystemTraction(project: Project, trading: Trading): DimensionResult {
  const hasMultiChainEvidence = project.chains.length > 1;
  const chainScore = hasMultiChainEvidence ? linearNormalize(project.chains.length, 1, 6) : null;

  if (!trading.available || trading.pools.length === 0) {
    if (chainScore === null) {
      return NOT_APPLICABLE(
        `No matched DexScreener pools and only ${project.chains.length} chain(s) on record — no real evidence of ecosystem breadth for this project (a single chain is this registry's universal default, not differentiating evidence).`
      );
    }
    const score = round1(chainScore);
    return { score, detail: `No matched DexScreener pools — using registry chain count alone: ${project.chains.length} chain(s) (${score}/100).` };
  }

  const distinctVenues = new Set(trading.pools.map((pool) => pool.dexId)).size;
  const venueScore = linearNormalize(distinctVenues, 1, 8);
  if (chainScore === null) {
    const score = round1(venueScore);
    return { score, detail: `${distinctVenues} distinct trading venue(s) (${score}/100); only 1 chain on record contributes no additional chain-breadth evidence.` };
  }
  const score = round1(venueScore * 0.6 + chainScore * 0.4);
  return {
    score,
    detail: `${distinctVenues} distinct trading venue(s) (${round1(venueScore)}/100) + ${project.chains.length} chain(s) (${round1(chainScore)}/100) = ${score}.`,
  };
}

// ---------------------------------------------------------------------------
// Dimension 7 — Security (Blockscout, contract verification coverage)
// ---------------------------------------------------------------------------

/**
 * 1. Measures: what fraction of this project's own registered on-chain
 *    contracts have real, Blockscout-verified source code on record.
 * 2. Matters: verified source is independently auditable by anyone — a
 *    real, objective trust signal distinct from how the token trades.
 * 3. Raw metric: `ContractDetail.verified` per registered contract address.
 * 4. Provider: Blockscout only.
 * 5. Unit: ratio (verified / total registered contracts).
 * 6. Freshness: PR-098.07's "Security" class, 45min/135min (split from the
 *    live chain-stats ticker's own faster 60s window — `blockscout/
 *    service.ts`'s `SECURITY_CACHE_TTL_MS`).
 * 7. Formula: `verifiedCount / totalCount * 100` — a project with multiple
 *    registered contracts is scored on ALL of them, never an arbitrary
 *    single one (the brief's explicit instruction).
 * 8. Outliers: inherently bounded (a ratio), no log/linear scaling needed.
 * 9. Missing data: `null` (N/A) when the project has no registered
 *    contracts at all, or every lookup genuinely failed (as opposed to
 *    resolving definitively unverified, which is real, valid evidence —
 *    a 0% verified score, not N/A).
 * 10. Stale data: a lookup that used `withStaleFallback` is honestly still
 *     counted (real, if possibly slightly old, evidence) — only a hard
 *     failure with no prior data drops that one contract from the count.
 * 11. Correlation risk: previously HIGH with Onchain Activity (PR-098.04's
 *     core finding — both depended on Blockscout). Re-verified here:
 *     Onchain Activity above is 100% DexScreener; this dimension is 100%
 *     Blockscout contract-verification data — no shared raw evidence.
 * 12. Minimum evidence: cross-dimension floor unchanged.
 * 13. Test strategy: fully-verified single contract, partially-verified
 *     multi-contract project, fully-unverified, zero registered contracts (N/A).
 */
export function normalizeSecurity(project: Project, contractDetailsByAddress: Record<string, ContractDetail>): DimensionResult {
  if (project.contracts.length === 0) {
    return NOT_APPLICABLE("No registered on-chain contracts for this project.");
  }
  const resolved = project.contracts
    .map((c) => contractDetailsByAddress[c.address.toLowerCase()] ?? contractDetailsByAddress[c.address])
    .filter((detail): detail is ContractDetail => detail !== undefined);
  if (resolved.length === 0) {
    return NOT_APPLICABLE("Blockscout verification lookup failed for every registered contract (no prior data to fall back on).");
  }
  const verifiedCount = resolved.filter((detail) => detail.verified).length;
  const score = round1((verifiedCount / resolved.length) * 100);
  return {
    score,
    detail: `${verifiedCount} of ${resolved.length} registered contract(s) verified on Blockscout = ${score}.`,
  };
}
