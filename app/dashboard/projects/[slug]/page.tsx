import { notFound } from "next/navigation";

import { getProject } from "@/data/projects/helpers";
import { getRawWhaleEvents, getSignals } from "@/lib/data/aggregate";
import { buildProjectIntelligence } from "@/lib/intelligence/engine";
import { buildIntelligenceReport } from "@/lib/intelligence/report";
import { buildHealthScorecard } from "@/lib/intelligence/scorecard";
import * as base from "@/lib/providers/base/service";
import * as blockscout from "@/lib/providers/blockscout/service";
import * as coingecko from "@/lib/providers/coingecko/service";
import * as defillama from "@/lib/providers/defillama/service";
import * as github from "@/lib/providers/github/service";
import { ProfileActivityFeed } from "@/components/explorer/ProfileActivityFeed";
import { ProfileBreadcrumb } from "@/components/explorer/ProfileBreadcrumb";
import { ProfileCommunityMetrics } from "@/components/explorer/ProfileCommunityMetrics";
import { ProfileHeader } from "@/components/explorer/ProfileHeader";
import { ProfileTokenAndPriceLive } from "@/components/explorer/ProfileTokenAndPriceLive";
import { ProfileMetrics } from "@/components/explorer/ProfileMetrics";
import { ProfileExecutiveIntelligence } from "@/components/explorer/ProfileExecutiveIntelligence";
import { ProfileIntelligence } from "@/components/explorer/ProfileIntelligence";
import { ProfileContracts } from "@/components/explorer/ProfileContracts";
import { ProfileGovernance } from "@/components/explorer/ProfileGovernance";
import { ProfileQuickStats } from "@/components/explorer/ProfileQuickStats";
import { ProfileRelatedIntelligence } from "@/components/explorer/ProfileRelatedIntelligence";
import { ProfileSectionNav } from "@/components/explorer/ProfileSectionNav";
import { ProjectHealthScorecard } from "@/components/explorer/ProjectHealthScorecard";
import type { SparklinePoint } from "@/lib/data/types";

type ProjectProfilePageProps = {
  params: Promise<{ slug: string }>;
};

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
export default async function ProjectProfilePage({ params }: ProjectProfilePageProps) {
  const { slug } = await params;

  const registryProject = getProject(slug);
  if (!registryProject) notFound();

  // Genesis date is fast (67-378ms observed) — unlike commit activity/TVL
  // history it isn't worth deferring behind its own Suspense boundary, so
  // it's fetched here, in parallel with the fast intelligence build, rather
  // than bundled into `extended`.
  const genesisPromise = registryProject.providerIds.coingeckoId
    ? coingecko.getCoinDetail(registryProject.providerIds.coingeckoId)
    : Promise.resolve(null);

  // PR13.7 Goal 14 — real finality lag (Base RPC's cheapest, shortest-TTL
  // provider), same "fast enough to not defer behind Suspense" treatment as
  // `genesisPromise` above rather than a new streamed component.
  const finalityPromise = base.getFinality();

  const [profileRes, genesisRes, whaleRes, signalsRes, finalityRes] = await Promise.allSettled([
    buildProjectIntelligence(registryProject, undefined, { extended: false }),
    genesisPromise,
    getRawWhaleEvents(),
    getSignals(),
    finalityPromise,
  ]);

  const profile = profileRes.status === "fulfilled" ? profileRes.value : null;
  if (!profile) notFound();

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

  const tvlHistoryPromise =
    profile.tvl.available && registryProject.providerIds.defillamaSlug
      ? defillama.getProtocolTvlHistory(registryProject.providerIds.defillamaSlug)
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

  const tokenContract = profile.contracts.items.find(
    (item) => item.chain === profile.chain.primaryChain && item.type === "token"
  );
  const transfersPromise =
    tokenContract && profile.chain.primaryChain === "base"
      ? blockscout.getTokenTransfers(tokenContract.address)
      : Promise.resolve(null);

  // PR13.7 Goal 10 — real per-address Blockscout verification detail for
  // every contract this project has registered (typically 0-3), fetched in
  // parallel, extended/Profile-page-only. Base-chain-only, same as the
  // token-transfer lookup above — Blockscout only indexes Base.
  const contractDetailsPromise = Promise.all(
    profile.contracts.items
      .filter((item) => item.chain === "base")
      .map((item) => blockscout.getContractDetail(item.address).then((result) => ({ address: item.address, result })))
  );

  const priceHistory: SparklinePoint[] | null =
    profile.market.sparkline7d.length > 0
      ? profile.market.sparkline7d.map((price, index) => ({ t: index, v: price }))
      : null;

  const githubUrl = profile.github.available && profile.github.fullName ? `https://github.com/${profile.github.fullName}` : null;
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

  const scorecardTiles = buildHealthScorecard({
    health: profile.health,
    confidence: profile.confidence,
    risk: profile.risk,
    market: profile.market,
    tvl: profile.tvl,
    trading: profile.trading,
    github: profile.github,
    governance: profile.governance,
    whaleEvents,
    narrativeLabel,
    communityLinkCount,
    communityLinkTotal,
  });

  const developerFallbackTile = scorecardTiles.find((tile) => tile.id === "developer")!;

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
  });

  return (
    <div className="flex flex-col gap-6">
      <ProfileBreadcrumb projectName={profile.identity.name} />

      <ProfileHeader
        identity={profile.identity}
        community={profile.community}
        chain={profile.chain}
        contracts={profile.contracts}
        github={profile.github}
        market={market}
        health={profile.health}
        confidence={profile.confidence}
        risk={profile.risk}
        coingeckoId={registryProject.providerIds.coingeckoId ?? null}
        defillamaSlug={registryProject.providerIds.defillamaSlug ?? null}
      />

      <ProfileRelatedIntelligence projectId={registryProject.id} />

      <ProfileCommunityMetrics github={profile.github} community={profile.community} contributorCountPromise={contributorCountPromise} />

      <ProfileQuickStats market={profile.market} tvl={profile.tvl} trading={profile.trading} />

      <ProfileSectionNav />

      {/*
        PR13.3 — one strict linear column (Header → Quick Stats →
        Executive Intelligence → Health Scorecard → Token & Price →
        Metrics → AI Intelligence → Contracts → Governance → Community →
        Activity Feed), replacing the previous 8/4 two-column grid so the
        mandated reading order holds on every viewport, not just mobile.
      */}
      <ProfileExecutiveIntelligence
        report={intelligenceReport}
        freshness={profile.freshness}
        developerFallbackTile={developerFallbackTile}
        commitActivityPromise={commitActivityPromise}
        contributorCountPromise={contributorCountPromise}
        releasesPromise={releasesPromise}
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
      />

      <ProfileTokenAndPriceLive
        identity={profile.identity}
        market={market}
        trading={profile.trading}
        tvl={profile.tvl}
        contracts={profile.contracts}
        chain={profile.chain}
        priceHistory={priceHistory}
        coingeckoId={registryProject.providerIds.coingeckoId ?? null}
      />

      <ProfileMetrics
        identity={profile.identity}
        trading={profile.trading}
        tvl={profile.tvl}
        github={profile.github}
        contracts={profile.contracts}
        chain={profile.chain}
        tvlHistoryPromise={tvlHistoryPromise}
        defillamaSlug={registryProject.providerIds.defillamaSlug ?? null}
        commitActivityPromise={commitActivityPromise}
        transfersPromise={transfersPromise}
        tokenSymbol={profile.market.symbol}
        finality={finality}
      />

      <ProfileIntelligence
        narrative={profile.narrative}
        risk={profile.risk}
        health={profile.health}
        confidence={profile.confidence}
        governance={profile.governance}
      />

      <ProfileContracts contracts={profile.contracts} chain={profile.chain} contractDetailsPromise={contractDetailsPromise} />

      <ProfileGovernance governance={profile.governance} governanceUrl={profile.community.governanceUrl} />

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
      />
    </div>
  );
}
