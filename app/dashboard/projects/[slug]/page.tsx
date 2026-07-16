import { notFound } from "next/navigation";

import { getProject } from "@/data/projects/helpers";
import { getRawWhaleEvents, getSignals } from "@/lib/data/aggregate";
import { buildProjectIntelligence } from "@/lib/intelligence/engine";
import { buildAiInsight, buildAiVerdict, buildExecutiveSummaryBullets, buildHealthScorecard } from "@/lib/intelligence/scorecard";
import * as blockscout from "@/lib/providers/blockscout/service";
import * as coingecko from "@/lib/providers/coingecko/service";
import * as defillama from "@/lib/providers/defillama/service";
import * as github from "@/lib/providers/github/service";
import { ProfileHeader } from "@/components/explorer/ProfileHeader";
import { ProfileTokenAndPrice } from "@/components/explorer/ProfileTokenAndPrice";
import { ProfileMetrics } from "@/components/explorer/ProfileMetrics";
import { ProfileExecutiveSummary } from "@/components/explorer/ProfileExecutiveSummary";
import { ProfileAIInsight } from "@/components/explorer/ProfileAIInsight";
import { ProfileIntelligence } from "@/components/explorer/ProfileIntelligence";
import { ProfileContracts } from "@/components/explorer/ProfileContracts";
import { ProfileGovernance } from "@/components/explorer/ProfileGovernance";
import { ProfileCommunity } from "@/components/explorer/ProfileCommunity";
import { ProfileSectionNav } from "@/components/explorer/ProfileSectionNav";
import { ProfileSummaryBanner } from "@/components/explorer/ProfileSummaryBanner";
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

  const [profileRes, genesisRes, whaleRes, signalsRes] = await Promise.allSettled([
    buildProjectIntelligence(registryProject, undefined, { extended: false }),
    genesisPromise,
    getRawWhaleEvents(),
    getSignals(),
  ]);

  const profile = profileRes.status === "fulfilled" ? profileRes.value : null;
  if (!profile) notFound();

  const genesisResult = genesisRes.status === "fulfilled" ? genesisRes.value : null;
  const market = { ...profile.market, genesisDate: genesisResult?.ok ? genesisResult.data : null };

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

  const tokenContract = profile.contracts.items.find(
    (item) => item.chain === profile.chain.primaryChain && item.type === "token"
  );
  const transfersPromise =
    tokenContract && profile.chain.primaryChain === "base"
      ? blockscout.getTokenTransfers(tokenContract.address)
      : Promise.resolve(null);

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

  const aiVerdict = buildAiVerdict(profile.health, profile.confidence, profile.risk);

  const executiveSummaryBullets = buildExecutiveSummaryBullets({
    verificationStatus: profile.community.verificationStatus,
    risk: profile.risk,
    confidence: profile.confidence,
    tvl: profile.tvl,
    market: profile.market,
    github: profile.github,
    governance: profile.governance,
    whaleEvents,
    narrativeLabel,
  });

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

  const aiInsight = buildAiInsight({
    health: profile.health,
    confidence: profile.confidence,
    risk: profile.risk,
    tvl: profile.tvl,
    market: profile.market,
    github: profile.github,
    governance: profile.governance,
    whaleEvents,
    sources: profile.sources,
    narrativeLabel,
  });

  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader
        identity={profile.identity}
        community={profile.community}
        chain={profile.chain}
        contracts={profile.contracts}
        github={profile.github}
        market={profile.market}
        tvl={profile.tvl}
      />

      <ProfileSectionNav />

      {/*
        PR12.1e — a real 12-column CSS Grid for this page only (never
        shared with Explorer/Dashboard/Landing). Full-width sections use
        `lg:col-span-12`; the main content stream and the Intelligence
        rail split 8/4. `order-*` (mobile) vs `lg:order-*` (desktop) let
        the rail sit beside the main column on desktop while still
        flowing to the very end — after Community, matching this page's
        intended Hero→…→Community→Activity reading order — on mobile,
        without duplicating any component or changing its own layout.
      */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <ProfileExecutiveSummary
            bullets={executiveSummaryBullets}
            verdict={aiVerdict}
            health={profile.health}
            confidence={profile.confidence}
            risk={profile.risk}
            freshness={profile.freshness}
          />
        </div>
        <div className="lg:col-span-12">
          <ProfileSummaryBanner
            verificationStatus={profile.community.verificationStatus}
            tvl={profile.tvl}
            health={profile.health}
            confidence={profile.confidence}
            github={profile.github}
            narrativeLabel={narrativeLabel}
            risk={profile.risk}
            sources={profile.sources}
            metadata={profile.metadata}
          />
        </div>
        <div className="lg:col-span-12">
          <ProjectHealthScorecard tiles={scorecardTiles} />
        </div>
        <div className="lg:col-span-12">
          <ProfileAIInsight insight={aiInsight} />
        </div>

        <div className="order-1 flex flex-col gap-4 lg:col-span-8">
          <ProfileTokenAndPrice
            identity={profile.identity}
            market={market}
            trading={profile.trading}
            contracts={profile.contracts}
            chain={profile.chain}
            priceHistory={priceHistory}
            coingeckoId={registryProject.providerIds.coingeckoId ?? null}
          />
          <ProfileMetrics
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
          />
          <ProfileContracts contracts={profile.contracts} chain={profile.chain} />
          <ProfileGovernance governance={profile.governance} governanceUrl={profile.community.governanceUrl} />
        </div>

        <div className="order-2 lg:order-3 lg:col-span-12">
          <ProfileCommunity
            socials={profile.community.socials}
            governanceUrl={profile.community.governanceUrl}
            websiteUrl={profile.identity.websiteUrl}
            githubUrl={githubUrl}
          />
        </div>

        <div className="order-3 flex flex-col gap-4 lg:order-2 lg:col-span-4">
          <ProfileIntelligence
            narrative={profile.narrative}
            risk={profile.risk}
            health={profile.health}
            confidence={profile.confidence}
            governance={profile.governance}
            github={profile.github}
            tvl={profile.tvl}
            whaleEvents={whaleEvents}
            signals={signals}
            tokenSymbol={profile.market.symbol}
            commitActivityPromise={commitActivityPromise}
            tvlHistoryPromise={tvlHistoryPromise}
            transfersPromise={transfersPromise}
          />
        </div>
      </div>
    </div>
  );
}
