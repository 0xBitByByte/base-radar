/**
 * PR-098.05 — Landing Page Intelligence Delivery Architecture.
 *
 * Produces one shared, server-side-cached snapshot of real TVL + Token 24H
 * Change for the Featured Ecosystem projects that have a verified registry
 * mapping (PR-098.01) — reusing the exact same, already-hardened
 * (`mergeMarket`/`mergeTvl`, PR-098.02) intelligence pipeline every other
 * live surface in this app uses. No new provider-matching logic here.
 *
 * The critical property this file exists to establish: `buildSnapshot()`
 * below calls into the real Provider Layer, whose `fetchJsonOnce()`
 * (`lib/providers/common/utilities.ts`) unconditionally uses
 * `cache: "no-store"` — a raw `fetch("no-store")` reachable directly in a
 * Server Component's own render path forces that ROUTE into full
 * request-time dynamic rendering (confirmed against
 * `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`,
 * this app's actual installed Next.js 16.3.4 behavior, not assumed from
 * training data — see the PR-098.05 audit report). Wrapping the whole
 * aggregation in `unstable_cache()` moves the caching boundary OUTSIDE the
 * page's own render tracking: Next.js treats the wrapped function as one
 * opaque, independently-cached unit and never inspects what caching mode
 * the fetches inside it use. `app/page.tsx` never sees a raw `no-store`
 * fetch in its own render path, so it can stay statically prerendered with
 * ISR (`export const revalidate`) instead of becoming fully dynamic — the
 * exact PR-097 static-performance property this PR was told to preserve.
 *
 * `unstable_cache` is soft-deprecated in favor of the `'use cache'`
 * directive + Cache Components (`experimental.cacheComponents` in
 * `next.config.ts`) — deliberately NOT adopted here: Cache Components is a
 * whole-application rendering-model migration (changes fetch defaults
 * app-wide, requires Node.js runtime everywhere, its own multi-step
 * migration guide) — wildly disproportionate to "cache one landing
 * section's data." `unstable_cache` remains fully functional without that
 * flag and is the correct, minimal, proportionate tool for this job.
 *
 * All 20 Featured Ecosystem visitors share ONE regeneration per revalidate
 * window (`FEATURED_INTELLIGENCE_REVALIDATE_SECONDS`) — never "N visitors
 * × provider calls," and never re-fetched per Featured project card
 * individually ("1 visitor × 19 sequential API calls") — one shared,
 * batched `fetchProviderBulkData()` call feeds every project.
 *
 * PR-098.06 — Refresh-Cycle Optimization audit found this file's first
 * version (PR-098.05) called `gatherProjectSources()` per project, which
 * unconditionally ALSO computes `trading`/`verifiedContract`/`network`,
 * and critically `github` via `matchGithub()` — a REAL, un-batchable,
 * PER-PROJECT live GitHub API call — even though this file only ever
 * reads `.market`/`.tvl`. That was up to 14 wasted live GitHub calls per
 * 30-minute refresh cycle. Fixed by calling the now-exported
 * `matchMarket()`/`matchTvl()` directly against the shared `bulk` instead
 * — the exact same matching logic, zero per-project live calls beyond
 * what `fetchProviderBulkData()` already batches once for everyone. See
 * the PR-098.06 report's provider-call matrix for the full audit.
 *
 * PR-098.07 — Freshness & Refresh Strategy audit found this file's outer
 * `unstable_cache`/ISR window (previously a flat 30 minutes) was exactly
 * the "one global TTL for every signal" anti-pattern this PR was told to
 * eliminate — TVL and Token 24H Change genuinely move at different rates
 * (see `lib/intelligence/freshnessPolicy.ts`'s audited classes). Lowered
 * to `FEATURED_INTELLIGENCE_REVALIDATE_SECONDS` below, matching the
 * fastest signal actually displayed (Token Price, 2min) — this only
 * controls how often the page CHECKS for fresher data; it does NOT force
 * more real provider calls, because the underlying per-provider caches
 * (`getOrSet`, retuned in this same PR) still gate real HTTP fetches at
 * their own, slower, correct cadence (TVL still only actually refetches
 * every ~12min regardless of how often this outer snapshot recomputes).
 * Each entry now also carries real per-signal freshness metadata
 * (`tvlFreshness`/`tokenChangeFreshness`) derived from the same
 * `fetchedAt` timestamps the provider layer already tracks — never a
 * second, separate "freshness fetch."
 *
 * PR-099 — Live Radar Score & Intelligence Normalization. Each entry now
 * also carries a real, live `radarScore` (`RadarScoreResult | null`),
 * computed from the 7 normalized dimensions in
 * `lib/intelligence/dimensionNormalization.ts` fed into the already-
 * validated, unchanged `computeRadarScore()` (PR-098.04). Three of the
 * seven dimensions (Developer Activity, Governance, Security) need real
 * data `fetchProviderBulkData()`'s shared bulk fetch doesn't carry — GitHub
 * repo stats, Snapshot proposals, and per-contract Blockscout verification
 * are genuinely per-project data with no bulk/batched provider endpoint
 * (the same real constraint PR-098.06 documented for GitHub). These are
 * fetched once per SHARED snapshot regeneration (not once per visitor —
 * the same architectural boundary every other call in this file already
 * respects), and each is independently cached at its own provider-layer
 * TTL (GitHub 30min, Snapshot 20min, Blockscout Security 45min —
 * PR-098.07), so real fetch volume stays bounded by those TTLs regardless
 * of this snapshot's own faster 3-minute regeneration cadence — the exact
 * "outer cadence checks, provider TTL gates" property PR-098.07
 * established. See the PR-099 report's measured call-count table.
 */

import { unstable_cache } from "next/cache";

import { getOrSet } from "@/lib/providers/common/cache";
import { getProject } from "@/data/projects/helpers";
import { fetchMarketTvlTradingBulkData, matchGithub, matchMarket, matchTrading, matchTvl } from "@/lib/intelligence/sources";
import { mergeGithub, mergeMarket, mergeTrading, mergeTvl } from "@/lib/intelligence/merge";
import type { ProjectSources } from "@/lib/intelligence/types";
import { resolveFreshness, type SignalFreshness } from "@/lib/intelligence/freshnessPolicy";
import {
  normalizeDeveloperActivity,
  normalizeEcosystemTraction,
  normalizeGovernance,
  normalizeMarketStrength,
  normalizeOnchainActivity,
  normalizeSecurity,
  normalizeTvl,
} from "@/lib/intelligence/dimensionNormalization";
import { computeRadarScore, type RadarScoreDimensionInput, type RadarScoreResult } from "@/lib/intelligence/radarScore";
import * as snapshotProvider from "@/lib/providers/snapshot/service";
import * as blockscout from "@/lib/providers/blockscout/service";
import * as githubProvider from "@/lib/providers/github/service";
import { contractDetailsByAddress, type ContractDetailEntry } from "@/lib/providers/blockscout/contractDetails";
import type { SnapshotProposal } from "@/lib/providers/snapshot/service";
import type { ContractDetail } from "@/lib/providers/blockscout/mapper";
import type { CommitActivity, ContributorCount } from "@/lib/providers/github/service";
import type { Project } from "@/data/projects/types";

/**
 * 3 minutes — PR-098.07: deliberately NOT identical to any single
 * provider's own retuned TTL (CoinGecko's 2min, DexScreener/DefiLlama's
 * 5/12min, ...) — a light staggering choice so this outer cache's own
 * expiry doesn't phase-lock with any one provider's, per the task's
 * "consider jitter/staggering to avoid a thundering herd" guidance.
 * Matches the fastest freshness class actually surfaced today (Token
 * Price, 2min) with a small margin.
 */
export const FEATURED_INTELLIGENCE_REVALIDATE_SECONDS = 180;

export type FeaturedIntelligenceEntry = {
  id: string;
  /** `false` whenever no verified registry mapping exists for this project (PR-098.01), or the live fetch found nothing real — never a fabricated placeholder. */
  available: boolean;
  tvlUsd: number | null;
  /** The project's own token USD price change over 24h — same strict CoinGecko-only semantics PR-098.02 established; never TVL/volume change. */
  tokenChangePct24h: number | null;
  /** `true` when this entry's real values are stale (a live provider fetch just failed during the last regeneration; the last successfully-fetched values are shown instead) — informational only, mirrors `Market.stale`/`Tvl` behavior elsewhere in this engine. */
  stale: boolean;
  /** PR-098.07 — real per-signal freshness, classified against `FRESHNESS_CLASSES.tvl`/`.tokenPrice`. `null` when `tvlUsd`/`tokenChangePct24h` is itself `null` (nothing to date). */
  tvlFreshness: SignalFreshness | null;
  tokenChangeFreshness: SignalFreshness | null;
  /**
   * PR-099 — the real, live Radar Score, computed from real normalized
   * provider data (`computeRadarScore()`, PR-098.04's unchanged
   * methodology). `null` exactly when `RadarScoreResult.score` is `null`
   * (insufficient evidence — fewer than 3 dimensions or under 40% weight
   * coverage) — never a fabricated number. Carries its own
   * `availability`/`coveragePct`/`confidenceMultiplier`/`dimensions`/
   * `scoreFreshness`/`explanation` — no separate "updatedAt" field: this
   * is computed fresh on every snapshot regeneration, so `snapshot.generatedAt`
   * is its effective timestamp, same as every other entry field.
   */
  radarScore: RadarScoreResult | null;
};

export type FeaturedIntelligenceSnapshot = {
  entries: FeaturedIntelligenceEntry[];
  generatedAt: string;
};

function unavailableEntry(id: string): FeaturedIntelligenceEntry {
  return { id, available: false, tvlUsd: null, tokenChangePct24h: null, stale: false, tvlFreshness: null, tokenChangeFreshness: null, radarScore: null };
}

/**
 * MASTER HARDENING PASS — Concern 1 (API cost audit). Was one
 * `snapshotProvider.getProposals(space)` call PER project with a
 * configured governance space (up to 9 real calls, one per unique space).
 * Replaced with ONE batched `getProposalsForSpaces(spaces)` call for every
 * space any requested project uses, mirroring the exact "shared bulk fetch,
 * matched per project" pattern `matchMarket`/`matchTvl`/`matchTrading`
 * already use against `bulk` — see `snapshot/service.ts`'s own doc comment
 * for the verified batching capability and its one documented tradeoff
 * (a batched-call failure degrades every space together, not just one).
 *
 * Returns a lookup function rather than the raw grouped map so call sites
 * read exactly like the old per-project version (`proposalsFor(project)`),
 * with the same `null` (not configured) vs. `[]` (configured, no
 * proposals) distinction `normalizeGovernance`'s detail messages rely on.
 */
async function fetchGovernanceProposalsForProjects(projects: Project[]): Promise<(project: Project) => SnapshotProposal[] | null> {
  const spaces = projects.map((p) => p.governance?.snapshotSpace).filter((space): space is string => Boolean(space));
  if (spaces.length === 0) return () => null;

  const result = await snapshotProvider.getProposalsForSpaces(spaces);
  const grouped = result.ok ? result.data : {};
  return (project: Project) => {
    const space = project.governance?.snapshotSpace;
    if (!space) return null;
    return grouped[space] ?? (result.ok ? [] : null); // batch failed entirely → honestly N/A, not a fabricated empty list
  };
}

/**
 * PR-099 — every one of this project's own registered contracts, checked
 * for real Blockscout verification (never just one arbitrary contract —
 * `normalizeSecurity`'s own explicit requirement). Mirrors the exact
 * pattern the real Project Profile page already uses
 * (`app/dashboard/projects/[slug]/page.tsx`'s `contractDetailsPromise`) —
 * no new provider logic, just the same per-address lookup reused here.
 */
async function fetchContractDetails(project: Project): Promise<Record<string, ContractDetail>> {
  if (project.contracts.length === 0) return {};
  const entries: ContractDetailEntry[] = await Promise.all(
    project.contracts.map(async (contract) => ({ address: contract.address, result: await blockscout.getContractDetail(contract.address) }))
  );
  return contractDetailsByAddress(entries);
}

/**
 * MASTER HARDENING PASS — Concern 3. Gated on the exact same condition
 * `matchGithub` already uses (a specific `repo`, not just an org-level
 * reference) — no project pays for this that wasn't already paying for the
 * repo+release calls. `null` (never a fabricated count) when not
 * configured or the live fetch fails; `normalizeDeveloperActivity` already
 * degrades gracefully (proportional weight redistribution) rather than
 * requiring this to succeed.
 */
async function fetchContributorCount(project: Project): Promise<ContributorCount | null> {
  if (!project.github?.repo) return null;
  const result = await githubProvider.getContributorCount(`${project.github.owner}/${project.github.repo}`);
  return result.ok ? result.data : null;
}

/**
 * PR-102 — 26-week Developer Activity cadence's real data source. Gated on
 * the same condition as `fetchContributorCount` above — no project pays
 * for this that wasn't already paying for the repo+release calls. `null`
 * (never fabricated) when not configured or the live fetch fails;
 * `mergeGithub`/`normalizeDeveloperActivity` already degrade gracefully
 * (proportional weight redistribution) when this is absent.
 */
async function fetchCommitActivity(project: Project): Promise<CommitActivity | null> {
  if (!project.github?.repo) return null;
  const result = await githubProvider.getCommitActivity(`${project.github.owner}/${project.github.repo}`);
  return result.ok ? result.data : null;
}

/** A `ProviderSlice` this file never needs a live value from — network/verifiedContract are read by nothing here (Security uses its own dedicated per-contract lookup, `fetchContractDetails`, not the coarse chain-wide `verifiedContract` slice). */
const NOT_NEEDED_SLICE = { data: null, status: "not_configured", fetchedAt: null, matchQuality: "none", detail: "Not fetched — not read by the Featured Intelligence snapshot." } as const;

/**
 * The uncached aggregation itself — pure orchestration over the existing,
 * already-tested Provider Layer + the new (PR-099) normalization layer, no
 * new provider-matching logic. Uses `matchMarket`/`matchTvl`/`matchTrading`
 * directly against the one shared `bulk` fetch (PR-098.06's pattern) for
 * the four dimensions that need nothing beyond it (Market Strength, TVL/
 * Liquidity, Onchain Activity, Ecosystem Traction); adds per-project
 * fetches (`matchGithub`, `fetchGovernanceProposals`, `fetchContractDetails`,
 * `fetchContributorCount`, `fetchCommitActivity` — PR-102) for the
 * dimensions/sub-signals that have no bulk/batched provider endpoint
 * (Developer Activity, Governance, Security) — see this file's module doc
 * comment for why that's a real, bounded, shared-snapshot-scoped cost, not
 * the "wasted, wrong data" problem PR-098.06 fixed for GitHub.
 * `Promise.allSettled`-style resilience: one project's registry/provider
 * hiccup degrades that single entry to
 * unavailable, never the whole snapshot (this function itself never
 * throws for a per-project issue — see the try/catch below).
 */
/**
 * MASTER HARDENING PASS — Concern 2 (concurrency deduplication).
 *
 * Investigation note (documented here because it changed the diagnosis
 * mid-audit — see the PR report's Concern 2 section for the full trace):
 * a first measurement of 20 concurrent calls to this function on a cold
 * cache showed real data loss (several projects' Radar Scores dropping to
 * null under concurrency that were non-null for a single caller), which
 * looked like a genuine dedup race. Root-causing it further found the
 * actual cause was a TEST-ISOLATION bug, not a production one:
 * `tests/lib/data/featuredIntelligenceProviderLoad.test.ts` reset the
 * provider cache and circuit breaker between phases but never
 * `resetRateLimitBucketsForTests()` (`lib/providers/common/rate-limit.ts`)
 * — so the "cold" reference build's own Blockscout calls had already
 * consumed most of its 30-req/60s app-enforced budget before the
 * "concurrent" phase ran, starving it. Fixed that test bug and re-measured
 * with EVERY relevant piece of shared state properly reset between phases:
 * with that fixed, 20 concurrent calls (even withOUT any additional
 * dedup layer beyond what already existed) converged to the exact same
 * call count and identical Radar Score output as a single cold call, every
 * time, deterministically — confirming `getOrSet`'s existing per-key
 * in-flight sharing (`common/cache.ts`) was already correct: its
 * check-cache / check-in-flight / set-in-flight sequence has no `await`
 * before the mutation, so concurrent callers issued from the same
 * synchronous frame (as `Promise.all(...)`-fanned-out calls are) can never
 * race past each other.
 *
 * IMPORTANT — precise claim: this was never shown to be a production
 * correctness bug. No isolated production-path test (i.e. one that rules
 * out shared test-only state) ever reproduced data loss under concurrency;
 * the one test that appeared to show it was itself the confound. Treat the
 * wrapping below as DEFENSE-IN-DEPTH, not a fix for a proven defect.
 *
 * It is still added, as a genuine (if smaller) hardening: it makes "at most
 * one real build in flight per project-id-set" an explicit, snapshot-level
 * guarantee instead of an emergent property that depends on every leaf call
 * happening to be correctly keyed, and it removes the redundant CPU work of
 * running the full per-project normalization/`computeRadarScore()`
 * pipeline once per concurrent caller instead of once total. Implemented by
 * reusing the same, already-proven `getOrSet` primitive every provider call
 * already uses — not a new cache mechanism — keyed by the sorted project id
 * list, same TTL as the outer `unstable_cache` window below. `getOrSet`
 * already handles rejection correctly (a failed build is never cached,
 * `inFlight` is cleared in `.finally()`, so the next caller genuinely
 * retries — no permanent poisoning), so nothing extra was needed there.
 */
function featuredIntelligenceSnapshotCacheKey(projectIds: string[]): string {
  return `featured-intelligence-snapshot:${[...projectIds].sort().join(",")}`;
}

/** Exported (not just used internally by the cached wrapper below) so it's directly unit-testable without needing to exercise or mock `unstable_cache`'s own request/build context. Itself wrapped in `getOrSet` (see the doc comment above) — callers get both the in-flight-dedup AND the same-TTL caching `getOrSet` already provides, on top of `getFeaturedIntelligenceSnapshot`'s outer `unstable_cache`/ISR layer. */
export function buildFeaturedIntelligenceSnapshot(projectIds: string[]): Promise<FeaturedIntelligenceSnapshot> {
  return getOrSet(featuredIntelligenceSnapshotCacheKey(projectIds), FEATURED_INTELLIGENCE_REVALIDATE_SECONDS * 1000, () =>
    buildFeaturedIntelligenceSnapshotUncached(projectIds)
  );
}

async function buildFeaturedIntelligenceSnapshotUncached(projectIds: string[]): Promise<FeaturedIntelligenceSnapshot> {
  const bulk = await fetchMarketTvlTradingBulkData();

  // One shared promise, started once, awaited by every project's own
  // closure below (never re-created per project) — the batched governance
  // fetch runs concurrently with every project's github/contract-detail
  // work, same as before, just fetched once for every project instead of
  // once per project.
  const projects = projectIds.map((id) => getProject(id)).filter((p): p is Project => p != null);
  const proposalsForPromise = fetchGovernanceProposalsForProjects(projects);

  const entries = await Promise.all(
    projectIds.map(async (id): Promise<FeaturedIntelligenceEntry> => {
      const project = getProject(id);
      if (!project) return unavailableEntry(id);

      try {
        const marketSlice = matchMarket(project, bulk.markets);
        const tvlSlice = matchTvl(project, bulk.protocols);
        const tradingSlice = matchTrading(project, bulk.pairs, bulk.tokenPairs);

        const [githubSlice, proposalsFor, contractDetails, contributors, commitActivity] = await Promise.all([
          matchGithub(project),
          proposalsForPromise,
          fetchContractDetails(project),
          fetchContributorCount(project),
          fetchCommitActivity(project),
        ]);
        const proposals = proposalsFor(project);

        const sources: ProjectSources = {
          market: marketSlice,
          tvl: tvlSlice,
          trading: tradingSlice,
          network: NOT_NEEDED_SLICE,
          verifiedContract: NOT_NEEDED_SLICE,
          github: githubSlice,
        };
        const market = mergeMarket(sources);
        const tvl = mergeTvl(sources);
        const trading = mergeTrading(sources);
        const github = mergeGithub(sources, commitActivity);

        const marketStrength = normalizeMarketStrength(marketSlice.data);
        const tvlLiquidity = normalizeTvl(project, tvl);
        const onchainActivity = normalizeOnchainActivity(trading);
        const developerActivity = normalizeDeveloperActivity(github, contributors);
        const governance = normalizeGovernance(project, proposals);
        const ecosystemTraction = normalizeEcosystemTraction(project, trading);
        const security = normalizeSecurity(project, contractDetails);

        const dimensionInputs: RadarScoreDimensionInput[] = [
          { id: "marketStrength", score: marketStrength.score, stale: market.stale },
          { id: "tvlLiquidity", score: tvlLiquidity.score, stale: tvlSlice.stale === true },
          { id: "onchainActivity", score: onchainActivity.score, stale: tradingSlice.stale === true },
          { id: "developerActivity", score: developerActivity.score, stale: github.stale },
          { id: "governance", score: governance.score, stale: false },
          { id: "ecosystemTraction", score: ecosystemTraction.score, stale: tradingSlice.stale === true },
          { id: "security", score: security.score, stale: false },
        ];
        const radarScore = computeRadarScore(dimensionInputs);

        const available = market.changePct24h !== null || tvl.tvlUsd !== null;
        return {
          id,
          available,
          tvlUsd: tvl.tvlUsd,
          tokenChangePct24h: market.changePct24h,
          stale: market.stale || tvlSlice.stale === true,
          tvlFreshness: tvl.tvlUsd !== null ? resolveFreshness(tvlSlice.fetchedAt, "tvl") : null,
          tokenChangeFreshness: market.changePct24h !== null ? resolveFreshness(marketSlice.fetchedAt, "tokenPrice") : null,
          radarScore,
        };
      } catch {
        // A per-project failure (a thrown error, not just an "unavailable"
        // provider result — those are handled honestly inside the
        // matchers/normalizers/merge already) degrades to unavailable
        // rather than failing the entire shared snapshot for every visitor.
        return unavailableEntry(id);
      }
    })
  );

  return { entries, generatedAt: new Date().toISOString() };
}

/**
 * The shared, cached entry point every request should call. `keyParts`
 * includes the sorted project id list so the cache key stays correct if
 * that list ever changes; in practice it's the same fixed 20 ids every
 * call (`FEATURED_PROJECTS`' own ids), so this resolves to one cache
 * entry, refreshed at most once per `FEATURED_INTELLIGENCE_REVALIDATE_SECONDS`
 * regardless of visitor count.
 */
export function getFeaturedIntelligenceSnapshot(projectIds: string[]): Promise<FeaturedIntelligenceSnapshot> {
  const cacheKey = [...projectIds].sort();
  return unstable_cache(() => buildFeaturedIntelligenceSnapshot(projectIds), ["featured-intelligence-snapshot", ...cacheKey], {
    revalidate: FEATURED_INTELLIGENCE_REVALIDATE_SECONDS,
    tags: ["featured-intelligence"],
  })();
}
