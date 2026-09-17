import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { getProject } from "@/data/projects/helpers";
import { CATEGORY_BRANDING } from "@/lib/branding/categories";
import { poolTokenIdentities, resolveTokenLogosForPools } from "@/lib/branding/resolveTokenLogo";
import { SITE, SITE_TWITTER_HANDLE } from "@/constants/site";
import { getProjectAIIntelligence, getRawWhaleEvents, getSignals } from "@/lib/data/aggregate";
import { buildProjectIntelligence } from "@/lib/intelligence/engine";
import { pairToTradingPool } from "@/lib/intelligence/merge";
import { buildIntelligenceReport } from "@/lib/intelligence/report";
import { buildHealthScorecard } from "@/lib/intelligence/scorecard";
import { normalizeName } from "@/lib/intelligence/helpers";
import { toLatestProjectHighlight, toRelatedProjectHighlights } from "@/lib/ai-intelligence/project-adapter";
import { filterLiveProjects } from "@/lib/projects/filter";
import { getLiveProjects } from "@/lib/projects/service";
import { evaluateServerCollections } from "@/lib/smart-collections/aggregate";
import { sortLiveProjects } from "@/lib/projects/sort";
import { resolveTradingDiscoveryStrategies } from "@/lib/trading/discoveryStrategy";
import { logProjectProfileTiming, markDuration, markStart, timed } from "@/lib/observability/serverTiming";
import type { TimingEntry } from "@/lib/observability/serverTiming";
import { withBoundedWait } from "@/lib/providers/common/utilities";
import * as base from "@/lib/providers/base/service";
import * as blockscout from "@/lib/providers/blockscout/service";
import * as coingecko from "@/lib/providers/coingecko/service";
import * as defillama from "@/lib/providers/defillama/service";
import * as dexscreener from "@/lib/providers/dexscreener/service";
import * as github from "@/lib/providers/github/service";
import { ProfileActivityFeed } from "@/components/explorer/ProfileActivityFeed";
import { ProfileBreadcrumb } from "@/components/explorer/ProfileBreadcrumb";
import { ProfileCommunityMetrics } from "@/components/explorer/ProfileCommunityMetrics";
import { ProfileHeader } from "@/components/explorer/ProfileHeader";
import { ProfileKeySignals } from "@/components/explorer/ProfileKeySignals";
import { ProfileQuickActions } from "@/components/explorer/ProfileQuickActions";
import { RecordProjectView } from "@/components/explorer/RecordProjectView";
import { ProfileTokenAndPriceLive } from "@/components/explorer/ProfileTokenAndPriceLive";
import { ProfileMetrics } from "@/components/explorer/ProfileMetrics";
import { ProfilePairIntelligence } from "@/components/explorer/ProfilePairIntelligence";
import { ProfileExecutiveIntelligence } from "@/components/explorer/ProfileExecutiveIntelligence";
import { ProfileIntelligencePanel } from "@/components/explorer/ProfileIntelligencePanel";
import { ProfileContracts } from "@/components/explorer/ProfileContracts";
import { ProfileGovernance } from "@/components/explorer/ProfileGovernance";
import { ProfileRecentHighlights } from "@/components/explorer/ProfileRecentHighlights";
import { ProfileRelatedIntelligence } from "@/components/explorer/ProfileRelatedIntelligence";
import { ProfileRelatedProjects } from "@/components/explorer/ProfileRelatedProjects";
import { ProfileSectionNav } from "@/components/explorer/ProfileSectionNav";
import { ProfileSources } from "@/components/explorer/ProfileSources";
import { ProfileSummary } from "@/components/explorer/ProfileSummary";
import { ProfileWhyItMatters } from "@/components/explorer/ProfileWhyItMatters";
import { ProjectHealthScorecard } from "@/components/explorer/ProjectHealthScorecard";
import { ProfileAIIntelligenceLinks } from "@/components/explorer/ProfileAIIntelligenceLinks";
import type { SparklinePoint } from "@/lib/data/types";

type ProjectProfilePageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * PR-073 refinement pass — a plain, page-local zone divider (no new
 * component, no new architecture) grouping the report's ~19 sections into
 * four readable zones matching an investor's actual reading order: the
 * verdict first, then the underlying market/on-chain data, then supporting
 * evidence and history, then related projects. Purely presentational —
 * every section beneath it still receives the exact same props it always
 * did.
 */
function ZoneHeading({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 px-1 text-[11px] font-semibold tracking-widest text-radar-light-muted/70 uppercase dark:text-radar-muted/60">
      {children}
    </p>
  );
}

/** PR-083 — `Date.now()` extracted into this standalone helper rather than called inline in the page component's own body, same pattern `ProfileTimeline.tsx`'s `splitByRecency` already uses (the purity lint rule flags an impure call written directly inside a component's render body, not one inside a called helper). */
function isWithinLast30Days(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() <= 30 * 24 * 60 * 60 * 1000;
}

/**
 * PR-105 — the bound applied (via `withBoundedWait`) to this page's
 * deferred/streamed provider calls (TVL history, token transfers, contract
 * detail, chain stats) — never the awaited critical-path batch above,
 * which keeps its own, separate, already-proven 5s whale race untouched.
 * Set to the exact same 5s figure as that existing precedent — deliberate
 * consistency, not a new arbitrary number: this PR's own measurements
 * found real, healthy-call latency up to ~2.5s (DefiLlama TVL history) and
 * ~1.7s (Blockscout token transfers) for these specific calls, so 5s
 * leaves comfortable headroom above anything actually observed while still
 * capping the previously-unbounded ~24.75s worst case (8s timeout × up to
 * 3 attempts) a genuinely stalled provider could otherwise impose on one
 * streamed section's Suspense boundary.
 */
const DEFERRED_PROVIDER_TIMEOUT_MS = 5_000;


/**
 * Per-project title/description/OG/canonical — `getProject` is a cheap,
 * synchronous registry lookup (no provider fetch), so this runs independent
 * of the page's own data-heavy `buildProjectIntelligence` call. Falls back
 * to root-layout defaults if the slug doesn't resolve; the page component's
 * own `notFound()` is still what actually produces the 404 response.
 *
 * Next's metadata merging replaces `openGraph`/`twitter` wholesale when a
 * segment sets either at all (shallow merge, not deep) — so every field
 * needed here (image, siteName, card type, handles) is repeated explicitly
 * rather than relying on inheritance from the root layout, which would
 * otherwise silently drop the image and card type.
 */
export async function generateMetadata({ params }: ProjectProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};

  const title = project.name;
  const description = project.shortDescription || project.description;
  const canonical = `/dashboard/projects/${project.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE.name,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE.name }],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
      site: SITE_TWITTER_HANDLE,
      creator: SITE_TWITTER_HANDLE,
    },
  };
}

/**
 * The Project Profile route (PR11). Streaming Architecture pass — this page
 * used to await one combined `getProjectIntelligence(slug)` (which always
 * fetched GitHub commit activity + DefiLlama TVL history + CoinGecko genesis
 * date, the three genuinely slow provider calls in this codebase) before
 * rendering anything. It now calls the same, unmodified
 * `buildProjectIntelligence` with `{ extended: false }` — an option that
 * function already exposed for exactly this "skip the heavy per-project
 * extras" case (`getAllProjectIntelligence`, the Explorer's batch path, has
 * always used it) — so Health/Risk/Confidence/AI Insight/Executive Summary
 * compute from real market/trading/tvl-snapshot/network/contracts/github-repo
 * data and render immediately. The three slow calls, plus the token-transfer
 * fetch, are kicked off unawaited right after and passed down as promises;
 * each is unwrapped by its own small `"use client"` `use()` component behind
 * its own `<Suspense>` — the same pattern `DashboardLayout`/
 * `LiveStatusBarAsync` already use for the live ticker, not a new one.
 *
 * Tradeoff, stated plainly: Health/Risk/Confidence/AI Insight/Executive
 * Summary are computed once, from the fast data only, and never
 * recomputed — this is server-rendered HTML with no client-side re-run once
 * the slow data streams in. Commit activity therefore never influences this
 * render's Risk "Developer Health" contributor or AI Insight's commit-count
 * bullet (both already have a graceful `null`-input branch for exactly this
 * case — this reuses it, it doesn't add a new one), and neither TVL's 7d/30d
 * change nor genesis date reach the Executive Summary bullets that read
 * them. Every one of those fields is still shown, in full, in its own
 * streamed widget below (Score Matrix's Market Momentum tile, the Health
 * Scorecard, Engineering Health's Commits (7d) tile, TVL & Liquidity's
 * chart) once it resolves.
 *
 * PR13.3 — UX/information-hierarchy polish pass, presentation only. Sections
 * were reordered into one strict linear flow (Header → Quick Stats →
 * Executive Intelligence → Health Scorecard → Token & Price → Metrics →
 * AI Intelligence → Contracts → Governance → Community → Activity Feed) and
 * the previous 8/4 two-column grid was collapsed to a single column, so the
 * mandated order reads top-to-bottom on every viewport instead of only on
 * mobile. No provider call, Intelligence Engine function, or calculation
 * changed — every section below still receives the exact same `profile.*`
 * fields it always did.
 */
/**
 * UX polish pass — FUTURE ARCHITECTURE NOTE, documentation only, nothing
 * below is implemented by this PR. A future "Community Confidence System"
 * PR would add a wallet-driven trust signal alongside this page's existing,
 * purely registry/provider-derived Health/Confidence/Risk scores:
 *
 * - Wallet-based Likes/Stars — a connected wallet can like/star a project.
 * - Community Confidence Score — an aggregate derived from like/star volume,
 *   distinct from (never blended into) the existing intelligence-engine
 *   Confidence score, so a provider-data signal and a crowd signal stay
 *   clearly separate and neither silently distorts the other.
 * - Verified Wallet Reputation — reputation levels (Genesis / Bronze /
 *   Silver / Gold / Diamond) built from real on-chain wallet history, so a
 *   single fresh wallet can't outweigh an established one.
 * - One Wallet = One Vote, with gas-protected voting (no on-chain tx cost to
 *   the voter) and an optional fully on-chain vote path for users who want
 *   an immutable record.
 * - Community Leaderboards — Most Trusted / Fastest Growing / Most
 *   Supported / Most Controversial, plus a Confidence Trend over time and a
 *   Verified Wallet Count per project.
 * - Share/PDF export integration — the header's `Share` button (see
 *   `ProfileQuickActions.tsx`) is already positioned as this feature's
 *   future trigger; `profile`/`intelligenceReport`/`scorecardTiles` below
 *   are already plain, fully-serializable objects a future exporter could
 *   consume directly, no new data plumbing needed.
 *
 * This would need real new infrastructure this PR does not add: wallet auth,
 * a votes/likes datastore, and new UI surfaces (leaderboards, reputation
 * badges) — out of scope here by design; documented so the next PR has a
 * concrete starting point instead of re-deriving it from scratch.
 */
export default async function ProjectProfilePage({ params }: ProjectProfilePageProps) {
  const { slug } = await params;

  const registryProject = getProject(slug);
  if (!registryProject) notFound();

  // PR-103 — lightweight, opt-in (`PERF_TRACE_PROJECT_PROFILE=1`) timing
  // instrumentation around this page's critical-path data loading. See
  // `lib/observability/serverTiming.ts`'s own doc comment: `timed()` never
  // changes what a wrapped promise resolves/rejects with, only records how
  // long it took, so this cannot alter the page's actual behavior.
  const renderStart = markStart();
  const timingEntries: TimingEntry[] = [];

  // PERFORMANCE (C2) — started here, immediately, rather than where it's
  // first awaited (the category-rank block below). `getLiveProjects()` is
  // `cache()`-wrapped and unconditionally needed later anyway by the Smart
  // Collections block (see that block's own comment: its own call already
  // reuses this exact request-scoped result today) — so starting it this
  // early costs nothing extra even when category rank ends up not needing
  // it (no TVL), and lets its real, measured cost run CONCURRENTLY with the
  // rest of this page's own already-concurrent fetch batch below, instead
  // of adding sequentially on top of it once that batch resolves. This is
  // a scheduling change only — the exact same cached computation, the
  // exact same fast-path/slow-path split, nothing recomputed twice and
  // nothing new added to what Smart Collections already needed regardless.
  // `.catch()` here only prevents a Node "unhandled rejection" warning if
  // this page 404s (`notFound()`, a few lines below) before either
  // consumer below ever awaits this promise — the real rejection (if any)
  // is still observed and handled wherever `liveProjectsPromise` is
  // actually awaited.
  const liveProjectsPromise = timed("getLiveProjects (kickoff)", getLiveProjects(), timingEntries);
  liveProjectsPromise.catch(() => {});

  // Genesis date is fast (67-378ms observed) — unlike commit activity/TVL
  // history it isn't worth deferring behind its own Suspense boundary, so
  // it's fetched here, in parallel with the fast intelligence build, rather
  // than bundled into `extended`.
  const genesisPromise = registryProject.providerIds.coingeckoId
    ? timed("genesis (CoinGecko)", coingecko.getCoinDetail(registryProject.providerIds.coingeckoId), timingEntries)
    : Promise.resolve(null);

  // PR13.7 Goal 14 — real finality lag (Base RPC's cheapest, shortest-TTL
  // provider), same "fast enough to not defer behind Suspense" treatment as
  // `genesisPromise` above rather than a new streamed component.
  const finalityPromise = timed("finality (Base RPC)", base.getFinality(), timingEntries);

  // PERFORMANCE (measured, not a blind tuning pass) — `getRawWhaleEvents()`
  // scans every registry-eligible token's real Blockscout transfer history
  // and was found to occasionally consume its entire allowed window (up to
  // ~12s, see `fetchTokenTransfers`'s own doc comment) even after that
  // endpoint's retry/timeout fix — and because this whole page waits for
  // every member of the batch below before its first byte, one slow token
  // was gating the *entire* project page, even though the page's own real
  // data (`buildProjectIntelligence`) reliably resolves in well under 2.5s.
  // Whale activity only feeds a small Key Signals tile, a Scorecard/Report
  // line, and Timeline rows — none of it is required for the page's core
  // identity/market/contracts content. Racing it against a 5s ceiling (real
  // headroom above every other batch member's observed worst case, well
  // under the pathological 12s case) means a slow token can no longer hold
  // up the whole page; on timeout this render simply proceeds with no whale
  // data, the same honest fallback already used whenever this promise
  // rejects (see `whaleRes.status !== "fulfilled"` below). The dedicated
  // Whale Explorer (`[slug]/whale/page.tsx`) does NOT do this — whale data
  // is that route's actual purpose, so it correctly waits the full window.
  // PR-103 — `getRawWhaleEvents()` itself is timed separately from the
  // race as a whole (`whale scan (raw)` vs `whale (raced, 5s ceiling)`) so
  // the report can tell apart "the scan was actually slow" from "the scan
  // was fine but something else in this same race lagged" — impossible to
  // tell from the race's own outcome alone.
  const rawWhaleEventsPromise = timed("whale scan (raw, getRawWhaleEvents)", getRawWhaleEvents(), timingEntries);
  const whalePromise = timed(
    "whale (raced, 5s ceiling)",
    Promise.race([
      rawWhaleEventsPromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Whale detection timed out for this page render")), 5_000)),
    ]),
    timingEntries
  );

  const criticalBatchStart = markStart();
  const [profileRes, genesisRes, whaleRes, signalsRes, finalityRes, aiIntelligenceRes] = await Promise.allSettled([
    timed("buildProjectIntelligence", buildProjectIntelligence(registryProject, undefined, { extended: false }), timingEntries),
    genesisPromise,
    whalePromise,
    timed("getSignals", getSignals(), timingEntries),
    finalityPromise,
    timed("getProjectAIIntelligence", getProjectAIIntelligence(registryProject.id), timingEntries),
  ]);
  const criticalBatchMs = markDuration(criticalBatchStart);

  const profile = profileRes.status === "fulfilled" ? profileRes.value : null;
  if (!profile) notFound();

  // PR-043 — real, already-ranked briefs mentioning this project, plus
  // registry metadata. `null` only if `getProjectAIIntelligence` itself
  // fails; never fabricated, never a placeholder — the Panel simply
  // renders nothing when this is empty (see `ProfileIntelligencePanel`).
  const aiIntelligence = aiIntelligenceRes.status === "fulfilled" ? aiIntelligenceRes.value : null;
  const latestIntelligence = aiIntelligence ? toLatestProjectHighlight(aiIntelligence.briefs) : undefined;
  const relatedIntelligence = aiIntelligence ? toRelatedProjectHighlights(aiIntelligence.briefs) : [];

  const genesisResult = genesisRes.status === "fulfilled" ? genesisRes.value : null;
  // Real, `null` only when CoinGecko has no genesis date for this token —
  // merged in here (not inside `buildProjectIntelligence`) because this is
  // the one fast-enough-to-not-defer extended field, fetched in parallel
  // with the main intelligence build rather than bundled into `extended`.
  const market = { ...profile.market, genesisDate: genesisResult?.ok ? genesisResult.data : null };

  const finalityResult = finalityRes.status === "fulfilled" ? finalityRes.value : null;
  const finality = finalityResult?.ok ? finalityResult.data : null;

  const allWhaleEvents = whaleRes.status === "fulfilled" ? whaleRes.value : [];
  const whaleEvents = allWhaleEvents.filter((event) => event.projectId === profile.identity.id);

  // PR-083 — Governance Activity tile density: computed here (a Server
  // Component) rather than inside `ProfileKeySignals` (a Client Component)
  // since it needs `Date.now()` (via `isWithinLast30Days`). Both are
  // zero-fetch aggregates over `profile.governance`, already fetched.
  const governancePassed30d = profile.governance?.filter((event) => event.status === "passed" && isWithinLast30Days(event.end)).length ?? 0;
  const governanceQuorumTracked = profile.governance?.filter((event) => event.quorumMet !== null) ?? [];
  const governanceQuorumPct =
    governanceQuorumTracked.length > 0
      ? Math.round((governanceQuorumTracked.filter((event) => event.quorumMet).length / governanceQuorumTracked.length) * 100)
      : null;

  const allSignals = signalsRes.status === "fulfilled" ? signalsRes.value : [];
  const signals = allSignals.filter(
    (signal) => signal.project.toLowerCase() === profile.identity.name.toLowerCase()
  );

  // The three genuinely slow provider calls this page depends on, plus
  // token transfers — kicked off now, deliberately never awaited here.
  // Each is passed straight through as a promise to a streamed component;
  // the page finishes rendering without waiting on any of them.
  const commitActivityPromise =
    profile.github.available && profile.github.fullName
      ? github.getCommitActivity(profile.github.fullName)
      : Promise.resolve(null);

  // PR-105 — `withBoundedWait` (`lib/providers/common/utilities.ts`) caps
  // how long this deferred Suspense boundary waits, without changing what
  // it resolves to on either path: real data on success (including a real
  // stale value, if `getProtocolTvlHistory`'s own `withStaleFallback`
  // already found one), or the same `ok:false` "unavailable" shape a
  // genuine failure already produces — just possibly sooner. Justified by
  // this PR's own measurement: DefiLlama's per-protocol TVL history showed
  // real spikes up to ~2.5s even on a healthy call; unbounded, the
  // provider layer's own retry/timeout stack could extend that to ~24.75s
  // worst case with nothing capping it before now.
  const tvlHistoryPromise =
    profile.tvl.available && registryProject.providerIds.defillamaSlug
      ? withBoundedWait("defillama", defillama.getProtocolTvlHistory(registryProject.providerIds.defillamaSlug), DEFERRED_PROVIDER_TIMEOUT_MS)
      : Promise.resolve(null);

  // PR13.7 Goal 2 — GitHub contributor count, extended/Profile-page-only,
  // a real GitHub REST call the Provider Layer never made before.
  const contributorCountPromise =
    profile.github.available && profile.github.fullName
      ? github.getContributorCount(profile.github.fullName)
      : Promise.resolve(null);

  // PR13.7 Goals 6/13 — up to 10 real releases, shared by the Scorecard's
  // Developer evidence tile (release count) and the Timeline's version
  // history (Goal 13) — one fetch, two consumers, never fetched twice.
  const releasesPromise =
    profile.github.available && profile.github.fullName ? github.getReleases(profile.github.fullName) : Promise.resolve(null);

  // Kept as its own lookup — Whale Activity's Blockscout token-transfer
  // feed (below) is genuinely token-only regardless of Trading Discovery
  // Strategy (a DEX project with no Base token has no token transfers to
  // track either), unrelated to how pools are discovered.
  const tokenContract = profile.contracts.items.find(
    (item) => item.chain === profile.chain.primaryChain && item.type === "token"
  );

  // Trading Discovery Strategy — routed through the one centralized
  // resolver (`lib/trading/discoveryStrategy.ts`), the same one
  // `matchTrading` (feeding `profile.trading.pools`, this call's own
  // fallback below) and the dedicated Pools page use. Previously this was
  // its own third, independent "does this project have a Base token
  // contract" check — correct for an asset-type project, wrong for a DEX
  // like Uniswap, whose real Base footprint is the pools it hosts, not a
  // governance token it doesn't have on Base at all.
  //
  // PR-084.01 — real multi-pool Trading Intelligence data for this one
  // project, on demand (see `dexscreener.getPairsForToken`'s doc comment
  // for why this is a justified second DexScreener request rather than a
  // change to the shared bulk `profile.trading` every other section reads).
  // Plain awaited call, not deferred behind Suspense — DexScreener isn't
  // this page's slow provider (that's DefiLlama/GitHub, already deferred
  // elsewhere), and `profile.trading` is already fetched synchronously the
  // same way. Falls back to the original single-pool `profile.trading.pools`
  // on any failure or empty result — Trading Intelligence is never broken,
  // never empty because of this call.
  // PR-103 — this whole loop is on the page's critical (awaited, not
  // deferred) path; timed as one span (`getPairsForToken (DexScreener,
  // post-batch)`) since it can run 1-2 real requests depending on how many
  // trading strategies this project has and whether the first one comes
  // back empty. `try/finally` (never `catch`) — a real throw here must
  // still propagate exactly as it did before this instrumentation existed;
  // this only records the duration on the way out, success or failure.
  const postBatchStart = markStart();

  // PR-104 — the confirmed DexScreener → token-logo waterfall (PR-103:
  // Morpho cold, DexScreener 303ms + logos 576ms = 884ms, strictly
  // additive). The real data dependency: `tradingPools` below is EITHER
  // `richerPairsResult.data` (only knowable once DexScreener responds) OR,
  // on any failure/empty result, `profile.trading.pools` — a value that's
  // already fully available right now, before DexScreener is even called
  // (it comes from `buildProjectIntelligence`, already resolved by the main
  // batch above). That fallback case is this page's single most common
  // outcome for a project whose trading data doesn't change between the
  // bulk-matched `profile.trading` and a fresh per-token DexScreener query.
  //
  // So: start resolving logos for `profile.trading.pools` CONCURRENTLY with
  // the DexScreener call below, instead of waiting for DexScreener first.
  // This is safe, not a race: `resolveTokenLogosForPools` reads no state
  // DexScreener produces, and `resolveTokenLogo`'s own cache
  // (`lib/branding/resolveTokenLogo.ts`) has genuine in-flight
  // deduplication and cross-call caching keyed by symbol/address — so if
  // the richer DexScreener path ends up needing to resolve overlapping
  // tokens moments later, that second call either shares the exact same
  // in-flight request (zero extra network calls) or reads an
  // already-cached hit, never issuing a true duplicate. When the fallback
  // branch is taken (no richer data), the two are exactly the same
  // question asked once — the prewarm result is reused directly rather
  // than resolved a second time.
  const fallbackLogosPromise = timed(
    "resolveTokenLogosForPools (prewarm, concurrent with DexScreener)",
    resolveTokenLogosForPools(poolTokenIdentities(profile.trading.pools)),
    timingEntries
  );
  fallbackLogosPromise.catch(() => {});

  const dexscreenerStart = markStart();
  const tradingStrategies = resolveTradingDiscoveryStrategies(registryProject);
  let richerPairsResult: Awaited<ReturnType<typeof dexscreener.getPairsForToken>> | null = null;
  try {
    for (const tradingStrategy of tradingStrategies) {
      if (tradingStrategy.kind === "token") {
        richerPairsResult = await dexscreener.getPairsForToken(tradingStrategy.tokenAddress);
      } else if (tradingStrategy.kind === "dex") {
        richerPairsResult = await dexscreener.getPairsByDexId(tradingStrategy.dexIds);
      } else {
        continue;
      }
      if (richerPairsResult.ok && richerPairsResult.data.length > 0) break;
    }
    timingEntries.push({ label: "getPairsForToken (DexScreener, post-batch)", durationMs: markDuration(dexscreenerStart), ok: true });
  } catch (err) {
    timingEntries.push({
      label: "getPairsForToken (DexScreener, post-batch)",
      durationMs: markDuration(dexscreenerStart),
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
  const tradingPools =
    richerPairsResult?.ok && richerPairsResult.data.length > 0 ? richerPairsResult.data.map(pairToTradingPool) : profile.trading.pools;

  // Token Logo System — Featured Pools (below) renders through the exact
  // same `PoolCardGrid`/`PairCard`/`TokenPairCluster` chain the dedicated
  // Pools page does, so it has the identical secondary/quote-token logo gap
  // — fixed the same way, via the one shared resolver, not a second copy of
  // this logic.
  //
  // PR-104 — `tradingPools === profile.trading.pools` (reference equality,
  // not a value comparison — the ternary above literally returns that same
  // array when the fallback branch is taken) means this is the identical
  // query the concurrent prewarm above already started: reuse it instead of
  // resolving the exact same thing twice. Only the richer-data branch
  // (a different, DexScreener-derived pool set, unknowable before this
  // point) needs a fresh resolution — same function, same inputs it always
  // had, just cache-assisted by the prewarm for any token the two sets
  // share.
  const tokenLogos =
    tradingPools === profile.trading.pools
      ? await fallbackLogosPromise
      : await timed("resolveTokenLogosForPools (post-batch, richer set)", resolveTokenLogosForPools(poolTokenIdentities(tradingPools)), timingEntries);

  // PR-105 — bounded, same justification as `tvlHistoryPromise` above:
  // measured up to ~1.7s on a healthy call this PR's own investigation,
  // previously unbounded against the shared ~24.75s retry/timeout worst
  // case. `withBoundedWait` never changes what this resolves to, only how
  // long this render waits for it.
  const transfersPromise =
    tokenContract && profile.chain.primaryChain === "base"
      ? withBoundedWait("blockscout", blockscout.getTokenTransfers(tokenContract.address), DEFERRED_PROVIDER_TIMEOUT_MS)
      : Promise.resolve(null);

  // PR13.7 Goal 10 — real per-address Blockscout verification detail for
  // every contract this project has registered (typically 0-3), fetched in
  // parallel, extended/Profile-page-only. Base-chain-only, same as the
  // token-transfer lookup above — Blockscout only indexes Base.
  //
  // PR-078 FINAL REVIEW — candidate addresses now mirror `sources.ts`'s
  // `matchVerifiedContract` exactly: `providerIds.blockscoutAddress` (if
  // set) is included alongside every registered Base contract, not just
  // `profile.contracts.items`. Every registry project that currently sets
  // `blockscoutAddress` happens to duplicate an existing `contracts[]`
  // entry (confirmed by checking all 12), but the schema and
  // `matchVerifiedContract` both explicitly support it being a distinct,
  // extra address — without this, a future project relying on
  // `blockscoutAddress` alone (no matching `contracts[]` entry) would read
  // "Registry Missing" on Evidence & Sources while the fast path correctly
  // attempted a real check, a real inconsistency this fixes before it can
  // ever actually occur.
  const blockscoutCandidateAddresses = [
    ...(registryProject.providerIds.blockscoutAddress ? [registryProject.providerIds.blockscoutAddress] : []),
    ...profile.contracts.items.filter((item) => item.chain === "base").map((item) => item.address),
  ].filter((address, index, all) => all.findIndex((other) => normalizeName(other) === normalizeName(address)) === index);

  // PR-105 — each address bounded individually (not the `Promise.all` as a
  // whole), same justification/bound as `transfersPromise` above — one
  // slow address degrades to "unavailable" on its own schedule rather than
  // extending every other address's own already-resolved result.
  const contractDetailsPromise = Promise.all(
    blockscoutCandidateAddresses.map((address) =>
      withBoundedWait("blockscout", blockscout.getContractDetail(address), DEFERRED_PROVIDER_TIMEOUT_MS).then((result) => ({ address, result }))
    )
  );

  // PR-078 §5 — real Base-chain-wide gas trend + network utilization,
  // extended/Profile-page-only (never part of the batch Explorer/Dashboard
  // path) — see `ProfileNetworkChainStatsAsync`.
  // PR-105 — bounded, same justification as the other deferred Blockscout
  // calls above.
  const chainStatsPromise = withBoundedWait("blockscout", blockscout.getChainStats(), DEFERRED_PROVIDER_TIMEOUT_MS);

  const priceHistory: SparklinePoint[] | null =
    profile.market.sparkline7d.length > 0
      ? profile.market.sparkline7d.map((price, index) => ({ t: index, v: price }))
      : null;

  const githubUrl = profile.github.available && profile.github.fullName ? `https://github.com/${profile.github.fullName}` : null;
  // Real registry-level signal, independent of whether the live GitHub fetch
  // itself succeeded — `profile.github.available` is `false` both when no
  // repo is configured AND when a configured repo's live fetch fails (rate
  // limit, network error), so it alone can't tell those two cases apart.
  // Empty states that need to say "not linked" vs. "linked but unavailable"
  // read this instead.
  const githubConfigured = Boolean(registryProject.github);
  const narrativeLabel = profile.narrative?.label ?? null;

  // Real completeness count (links present ÷ platforms this codebase
  // tracks) — feeds the Health Scorecard's Community tile. Never a
  // fabricated engagement/quality metric.
  const communityLinkFields = [
    profile.identity.websiteUrl,
    githubUrl,
    profile.community.socials.twitter,
    profile.community.socials.discord,
    profile.community.socials.telegram,
    profile.community.socials.farcaster,
    profile.community.governanceUrl,
    profile.community.socials.docs,
    profile.community.socials.blog,
    profile.community.socials.forum,
    profile.community.socials.medium,
    profile.community.socials.mirror,
    profile.community.socials.linkedin,
  ];
  const communityLinkCount = communityLinkFields.filter(Boolean).length;
  const communityLinkTotal = communityLinkFields.length;

  // PR-062 Task 1/2 — this project's real rank by TVL among its category
  // peers, reusing the exact same `lib/projects` Live Projects Service the
  // Projects list page already calls (`filterLiveProjects`/
  // `sortLiveProjects`) — never a second ranking implementation. Only
  // computed when this project itself has real TVL (a project with no TVL
  // can't be a "leader" by TVL); any failure to load the comparison set
  // degrades to `null`, never blocking the page or fabricating a rank.
  let categoryTvlLeadership: { rank: number; totalInCategory: number } | null = null;
  // PR-083 — Category Rank card density: two more real ranks, reusing the
  // exact same already-fetched `liveProjects`/`categoryPeers` this block
  // already builds for `categoryTvlLeadership` — just re-sorting the same
  // in-memory arrays by a different `SortField`, never a second fetch or a
  // second ranking implementation.
  let categoryMarketCapLeadership: { rank: number; totalInCategory: number } | null = null;
  let baseEcosystemTvlLeadership: { rank: number; totalInCategory: number } | null = null;
  const primaryCategory = profile.identity.categories[0];
  if (primaryCategory && profile.tvl.available && profile.tvl.tvlUsd !== null) {
    try {
      // PERFORMANCE (C2, measured, not a blind tuning pass) — `getLiveProjects()`
      // rebuilds full `ProjectIntelligence` (its own GitHub/governance/market
      // calls) for every registry project, not just this one, purely to rank
      // this project among its peers — previously measured at 1-2s on its
      // own, added sequentially because this block awaited a *fresh*
      // `getLiveProjects()` call only once execution reached here, after the
      // main batch above had already fully resolved. Awaiting the shared
      // `liveProjectsPromise` (started at the very top of this function,
      // before that main batch even began) instead means this same
      // computation now overlaps with the rest of the page's already-
      // concurrent work rather than stacking on top of it — same cached
      // result, same data, no new fetch. Same race-with-honest-fallback
      // treatment as the whale fetch above: on timeout this throws into the
      // catch below, which already leaves every rank `null` (the UI already
      // renders that as "unavailable") — reusing the existing failure path,
      // not a new one.
      const liveProjects = await timed(
        "getLiveProjects (await, category-rank block)",
        Promise.race([
          liveProjectsPromise,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Category rank comparison timed out for this page render")), 4_000)),
        ]),
        timingEntries
      );
      const categoryPeers = sortLiveProjects(
        filterLiveProjects(liveProjects, { category: primaryCategory, hasTvl: true }),
        "tvl",
        "desc"
      );
      const rankIndex = categoryPeers.findIndex((project) => project.id === registryProject.id);
      if (rankIndex !== -1) {
        categoryTvlLeadership = { rank: rankIndex + 1, totalInCategory: categoryPeers.length };
      }

      // Only claim a market-cap rank when this project itself has a real
      // market cap — same "never rank leadership you can't verify" guard the
      // TVL rank above already applies to itself.
      if (profile.market.available && profile.market.marketCapUsd !== null) {
        const categoryPeersByMarketCap = sortLiveProjects(categoryPeers, "marketCap", "desc");
        const marketCapRankIndex = categoryPeersByMarketCap.findIndex((project) => project.id === registryProject.id);
        if (marketCapRankIndex !== -1) {
          categoryMarketCapLeadership = { rank: marketCapRankIndex + 1, totalInCategory: categoryPeersByMarketCap.length };
        }
      }

      const ecosystemPeers = sortLiveProjects(filterLiveProjects(liveProjects, { hasTvl: true }), "tvl", "desc");
      const ecosystemRankIndex = ecosystemPeers.findIndex((project) => project.id === registryProject.id);
      if (ecosystemRankIndex !== -1) {
        baseEcosystemTvlLeadership = { rank: ecosystemRankIndex + 1, totalInCategory: ecosystemPeers.length };
      }
    } catch {
      categoryTvlLeadership = null;
      categoryMarketCapLeadership = null;
      baseEcosystemTvlLeadership = null;
    }
  }

  // PR-090.06 — Project Integration. Real Smart Collection membership for
  // THIS project, reusing `evaluateServerCollections()` (the exact same
  // evaluator `/dashboard/collections` uses) over the same `liveProjectsPromise`
  // started at the top of this function (C2 — was a second, later
  // `getLiveProjects()` call; still `cache()`-deduped either way, so this
  // was already free, but awaiting the shared, early-started promise here
  // too keeps both consumers reading from one obviously-single source
  // rather than two call sites that happen to resolve to the same thing) —
  // and `allWhaleEvents`, already fetched above. Only the 7 server-
  // evaluated collections can be known here (the other 3 need client-only
  // Alert Engine/Daily Brief data); silence on those 3 is honest, not a
  // false negative.
  let projectSmartCollections: { id: string; name: string }[] = [];
  try {
    const liveProjectsForCollections = await timed(
      "getLiveProjects (await, smart-collections block)",
      Promise.race([
        liveProjectsPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Smart Collections lookup timed out for this page render")), 4_000)),
      ]),
      timingEntries
    );
    const collectionResults = evaluateServerCollections(liveProjectsForCollections, allWhaleEvents, new Date().toISOString());
    projectSmartCollections = collectionResults
      .filter((result) => result.matches.some((match) => match.projectId === registryProject.id))
      .map((result) => ({ id: result.id, name: result.name }));
  } catch {
    projectSmartCollections = [];
  }

  // PR-062 Task 5 — real registry lifecycle timestamps, already on the
  // static registry entry (`data/projects/types.ts`'s `ProjectLifecycle`),
  // for the Timeline's "Registry updates"/"Discovery updates" events.
  const registryUpdatedAt = registryProject.lifecycle?.updatedAt ?? null;
  const discoveredAt = registryProject.lifecycle?.discoveredAt ?? null;
  const discoverySource = registryProject.lifecycle?.discoverySource ?? null;

  const scorecardTiles = buildHealthScorecard({
    health: profile.health,
    confidence: profile.confidence,
    risk: profile.risk,
    market: profile.market,
    tvl: profile.tvl,
    trading: profile.trading,
    github: profile.github,
    governance: profile.governance,
    governanceType: profile.community.governanceType,
    whaleEvents,
    narrativeLabel,
    communityLinkCount,
    communityLinkTotal,
    contracts: profile.contracts,
    verificationStatus: profile.community.verificationStatus,
    docsUrl: profile.community.socials.docs ?? null,
  });

  const intelligenceReport = buildIntelligenceReport({
    identity: profile.identity,
    health: profile.health,
    confidence: profile.confidence,
    risk: profile.risk,
    tvl: profile.tvl,
    market: profile.market,
    github: profile.github,
    chain: profile.chain,
    verificationStatus: profile.community.verificationStatus,
    governance: profile.governance,
    whaleEvents,
    sources: profile.sources,
    narrativeLabel,
    scorecardTiles,
    tradingPoolCount: profile.trading.pools.length,
    coingeckoId: registryProject.providerIds.coingeckoId ?? null,
    defillamaSlug: registryProject.providerIds.defillamaSlug ?? null,
    contracts: profile.contracts,
    community: profile.community,
    categoryTvlLeadership,
    registryUpdatedAt,
    discoveredAt,
    discoverySource,
  });

  const categoryLabel = primaryCategory ? CATEGORY_BRANDING[primaryCategory].label : null;

  // PR-103 — one structured summary line per render, logged last so it
  // covers every timed span above. `postBatchMs` intentionally spans from
  // right after the critical `Promise.allSettled` batch to here (the last
  // point before JSX construction) — everything in between is real,
  // awaited, on-the-critical-path work; the streamed/deferred promises
  // (`commitActivityPromise`, `tvlHistoryPromise`, `contractDetailsPromise`,
  // `contributorCountPromise`, `releasesPromise`, `transfersPromise`,
  // `chainStatsPromise`) are deliberately NOT included here — they are
  // passed down unawaited and resolve after this function has already
  // returned, exactly as designed; instrumenting them would require
  // awaiting them, which would defeat the point of deferring them.
  logProjectProfileTiming({
    slug,
    totalMs: markDuration(renderStart),
    criticalBatchMs,
    postBatchMs: markDuration(postBatchStart),
    entries: timingEntries,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* UX polish pass, Section 7 — "Back to Projects" (inside `ProfileBreadcrumb`) stays left-aligned; Watchlist/Alert/Share/Compare move to the same row's right edge, directly above the header card — a single left/right toolbar row instead of two stacked full-width blocks. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ProfileBreadcrumb projectName={profile.identity.name} />
        <ProfileQuickActions projectId={registryProject.id} projectName={profile.identity.name} />
        <RecordProjectView projectId={registryProject.id} projectName={profile.identity.name} projectSlug={slug} />
      </div>

      <ProfileHeader
        identity={profile.identity}
        community={profile.community}
        chain={profile.chain}
        contracts={profile.contracts}
        github={profile.github}
        market={market}
        tvl={profile.tvl}
        trading={profile.trading}
        health={profile.health}
        confidence={profile.confidence}
        risk={profile.risk}
        coingeckoId={registryProject.providerIds.coingeckoId ?? null}
        defillamaSlug={registryProject.providerIds.defillamaSlug ?? null}
        categoryTvlLeadership={categoryTvlLeadership}
        contractDetailsPromise={contractDetailsPromise}
        priceHistory={priceHistory}
      />

      <ProfileRelatedIntelligence projectId={registryProject.id} />

      <ProfileAIIntelligenceLinks smartCollections={projectSmartCollections} />

      {/* UX polish pass, Sections 15/18 — the old standalone `ProfileQuickStats` section (Price/Market Cap/TVL as large "emphasized" cards, Liquidity/Volume/FDV below) duplicated the same six numbers as full-size cards, once more here and again in the Overview zone's `ExpandableMetricCard`s below. Replaced by the header's compact stat-chip row (Section 15) — the Overview zone remains the one place with the full-detail cards. */}

      {/* PR-073 refinement pass — a concise, four-tile "Key Signals" strip: real signals (category rank, 7d momentum, governance activity, whale activity) that today only exist buried deep in the page or hidden entirely unless this project happens to be a category #1. Same data, surfaced as a glance instead of only in long-form prose or after several more scrolls. */}
      <ProfileKeySignals
        market={market}
        categoryLabel={categoryLabel}
        categoryTvlLeadership={categoryTvlLeadership}
        categoryMarketCapLeadership={categoryMarketCapLeadership}
        baseEcosystemTvlLeadership={baseEcosystemTvlLeadership}
        governance={profile.governance}
        governanceType={profile.community.governanceType}
        governancePassed30d={governancePassed30d}
        governanceQuorumPct={governanceQuorumPct}
        whaleEvents={whaleEvents}
        whaleHref={`/dashboard/projects/${slug}/whale`}
      />

      <ProfileSectionNav />

      {/*
        PR-079 Phase 6 — regrouped into the spec's named zones (Overview →
        Intelligence → Market → Trust → Governance → Activity → Sources,
        Timeline lives inside Activity's `ProfileActivityFeed`/
        `ProfileTimeline`). Every section still receives the exact same
        `profile.*`/`intelligenceReport` fields it always did — this is a
        render-order change only, no new provider call, no new calculation.
        Quick Stats/Key Signals stay above this nav (they're the page's
        always-visible glance strip, not scoped to one zone); the Overview
        zone below is the Token & Price metric cards.
      */}
      <ZoneHeading>Intelligence</ZoneHeading>

      <ProfileSummary thesis={intelligenceReport.thesis} />

      <ProfileExecutiveIntelligence
        report={intelligenceReport}
        freshness={profile.freshness}
        sources={profile.sources}
        verificationStatus={profile.community.verificationStatus}
        aiHref={`/dashboard/projects/${slug}/ai`}
        websiteUrl={profile.identity.websiteUrl}
      />

      <ProfileWhyItMatters highlights={intelligenceReport.highlights} />

      <ProfileCommunityMetrics
        github={profile.github}
        community={profile.community}
        contributorCountPromise={contributorCountPromise}
        commitActivityPromise={commitActivityPromise}
        githubRepo={registryProject.github ?? null}
        githubConfigured={githubConfigured}
        sources={profile.sources}
        communityLinkCount={communityLinkCount}
        communityLinkTotal={communityLinkTotal}
      />

      <ProjectHealthScorecard
        tiles={scorecardTiles}
        health={profile.health}
        confidence={profile.confidence}
        risk={profile.risk}
        verificationStatus={profile.community.verificationStatus}
        commitActivityPromise={commitActivityPromise}
        contributorCountPromise={contributorCountPromise}
        releasesPromise={releasesPromise}
        lastUpdated={profile.freshness.newestSourceAt}
      />

      {/* PR-085.01 — the old inline "AI Intelligence" section (`ProfileIntelligence`)
          was retired here: its full Risk Analysis and itemized Health/
          Confidence factor detail duplicated the `/ai` report page verbatim
          (already one click away via Executive Intelligence's own "View
          Full AI Intelligence Report" link above), and its one non-
          duplicated fact — the Narrative Signal sentence — is redundant
          with `buildThesis()`'s own "Near-term momentum reads
          {narrativeLabel}" clause already in the Project Summary paragraph
          above. See `ProfileExecutiveIntelligence.tsx`'s own doc comment. */}

      {aiIntelligence && (
        <ProfileIntelligencePanel
          registry={aiIntelligence.registry}
          latest={latestIntelligence}
          related={relatedIntelligence}
          evidenceSummary={aiIntelligence.evidenceSummary}
          sources={aiIntelligence.sources}
        />
      )}

      {/* PR-084.01 — Overview zone (Token & Price) relocated here from above
          the Intelligence zone: Price naturally leads into Trading, so the
          reading flow is now Project -> Market (Price) -> Trading -> Contracts
          -> Governance. Zone heading text unchanged, only its position moved
          — ProfileSectionNav's SECTIONS array was reordered to match. */}
      <ZoneHeading>Overview</ZoneHeading>

      <ProfileTokenAndPriceLive
        identity={profile.identity}
        market={market}
        trading={profile.trading}
        tvl={profile.tvl}
        priceHistory={priceHistory}
        coingeckoId={registryProject.providerIds.coingeckoId ?? null}
        tvlHistoryPromise={tvlHistoryPromise}
      />

      {/* PR-084 Stage 1 / PR-084.01 — Token Pair Intelligence now fills the
          slot this "Market" zone reserved since PR-080; `pools` is the
          richer, real multi-pool data resolved above, falling back to
          `profile.trading.pools` untouched — Market Overview above still
          reads `profile.trading` directly and is unaffected by this. */}
      <ZoneHeading>Market</ZoneHeading>

      {/* Token Logo System — `profile.identity.logoUrl` is this page's own
          already-resolved centralized value (the same one the page header
          renders), not `market.imageUrl` read directly. Guarantees this
          section's primary token icon can never diverge from the header
          logo above it, and still resolves correctly when CoinGecko alone
          has nothing but the registry/DefiLlama/GitHub tiers do. */}
      <ProfilePairIntelligence
        pools={tradingPools}
        tokenSymbol={profile.market.symbol}
        tokenLogoUrl={profile.identity.logoUrl}
        tokenLogos={tokenLogos}
        poolsHref={`/dashboard/projects/${slug}/pools`}
      />

      <ProfileContracts
        contracts={profile.contracts}
        chain={profile.chain}
        contractDetailsPromise={contractDetailsPromise}
        contractsHref={`/dashboard/projects/${slug}/contracts`}
      />

      <ProfileMetrics
        identity={profile.identity}
        contracts={profile.contracts}
        chain={profile.chain}
        transfersPromise={transfersPromise}
        tokenSymbol={profile.market.symbol}
        finality={finality}
        contractDetailsPromise={contractDetailsPromise}
        chainStatsPromise={chainStatsPromise}
      />

      {/* PR-085.01 — the "Trust" zone (`ProfileTrustCenter`) was retired
          here: an audit found 6 of its 8 tiles already had a fuller,
          more-detailed home elsewhere on this page (Verification/Confidence
          → the Scorecard above, GitHub/Docs/Registry-Completeness → the
          Community section above, Verified Contracts → the Network section
          directly above this comment). Its two genuinely unique facts
          (Official Website configured, live-provider coverage) were
          relocated into `ProfileExecutiveIntelligence`'s info row — see
          that component's own doc comment. */}

      <ZoneHeading>Governance</ZoneHeading>

      <ProfileGovernance
        governance={profile.governance}
        governanceUrl={profile.community.governanceUrl}
        governanceType={profile.community.governanceType}
        governanceHref={`/dashboard/projects/${slug}/governance`}
      />

      {/* PR-079 Section 6 — Recent Highlights docked immediately above
          Activity Feed/Timeline (previously floated alone between Sources
          and Activity Feed) since its categories (release/governance/whale/
          tvl/registry/discovery) directly overlap what Activity/Timeline
          already show in full below it. */}
      <ZoneHeading>Activity</ZoneHeading>

      <ProfileRecentHighlights entries={intelligenceReport.recentDevelopments} />

      <ProfileActivityFeed
        github={profile.github}
        tvl={profile.tvl}
        risk={profile.risk}
        governance={profile.governance}
        whaleEvents={whaleEvents}
        signals={signals}
        tokenSymbol={profile.market.symbol}
        commitActivityPromise={commitActivityPromise}
        tvlHistoryPromise={tvlHistoryPromise}
        transfersPromise={transfersPromise}
        releasesPromise={releasesPromise}
        registryUpdatedAt={registryUpdatedAt}
        discoveredAt={discoveredAt}
        discoverySource={discoverySource}
      />

      <ZoneHeading>Sources</ZoneHeading>

      <ProfileSources
        sources={profile.sources}
        thingsWeCouldntVerify={intelligenceReport.thingsWeCouldntVerify}
        contractDetailsPromise={contractDetailsPromise}
      />

      {primaryCategory && (
        <>
          <ZoneHeading>Related</ZoneHeading>
          <ProfileRelatedProjects currentProjectId={registryProject.id} category={primaryCategory} tags={profile.identity.tags} />
        </>
      )}
    </div>
  );
}
