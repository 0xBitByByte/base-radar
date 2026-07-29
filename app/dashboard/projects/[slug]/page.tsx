import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getProject } from "@/data/projects/helpers";
import { SITE, SITE_TWITTER_HANDLE } from "@/constants/site";
import { getProjectAIIntelligence, getRawWhaleEvents, getSignals } from "@/lib/data/aggregate";
import { buildProjectIntelligence } from "@/lib/intelligence/engine";
import { buildIntelligenceReport } from "@/lib/intelligence/report";
import { buildHealthScorecard } from "@/lib/intelligence/scorecard";
import { toLatestProjectHighlight, toRelatedProjectHighlights } from "@/lib/ai-intelligence/project-adapter";
import { filterLiveProjects } from "@/lib/projects/filter";
import { getLiveProjects } from "@/lib/projects/service";
import { sortLiveProjects } from "@/lib/projects/sort";
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
import { ProfileIntelligencePanel } from "@/components/explorer/ProfileIntelligencePanel";
import { ProfileContracts } from "@/components/explorer/ProfileContracts";
import { ProfileGovernance } from "@/components/explorer/ProfileGovernance";
import { ProfileQuickStats } from "@/components/explorer/ProfileQuickStats";
import { ProfileRecentHighlights } from "@/components/explorer/ProfileRecentHighlights";
import { ProfileRelatedIntelligence } from "@/components/explorer/ProfileRelatedIntelligence";
import { ProfileRelatedProjects } from "@/components/explorer/ProfileRelatedProjects";
import { ProfileSectionNav } from "@/components/explorer/ProfileSectionNav";
import { ProfileSources } from "@/components/explorer/ProfileSources";
import { ProfileSummary } from "@/components/explorer/ProfileSummary";
import { ProfileTrustCenter } from "@/components/explorer/ProfileTrustCenter";
import { ProfileWhyItMatters } from "@/components/explorer/ProfileWhyItMatters";
import { ProjectHealthScorecard } from "@/components/explorer/ProjectHealthScorecard";
import type { SparklinePoint } from "@/lib/data/types";

type ProjectProfilePageProps = {
  params: Promise<{ slug: string }>;
};

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

  const [profileRes, genesisRes, whaleRes, signalsRes, finalityRes, aiIntelligenceRes] = await Promise.allSettled([
    buildProjectIntelligence(registryProject, undefined, { extended: false }),
    genesisPromise,
    getRawWhaleEvents(),
    getSignals(),
    finalityPromise,
    getProjectAIIntelligence(registryProject.id),
  ]);

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
  const primaryCategory = profile.identity.categories[0];
  if (primaryCategory && profile.tvl.available && profile.tvl.tvlUsd !== null) {
    try {
      const liveProjects = await getLiveProjects();
      const categoryPeers = sortLiveProjects(
        filterLiveProjects(liveProjects, { category: primaryCategory, hasTvl: true }),
        "tvl",
        "desc"
      );
      const rankIndex = categoryPeers.findIndex((project) => project.id === registryProject.id);
      if (rankIndex !== -1) {
        categoryTvlLeadership = { rank: rankIndex + 1, totalInCategory: categoryPeers.length };
      }
    } catch {
      categoryTvlLeadership = null;
    }
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
    whaleEvents,
    narrativeLabel,
    communityLinkCount,
    communityLinkTotal,
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
        categoryTvlLeadership={categoryTvlLeadership}
      />

      <ProfileRelatedIntelligence projectId={registryProject.id} />

      <ProfileQuickStats market={profile.market} tvl={profile.tvl} trading={profile.trading} />

      <ProfileSectionNav />

      {/*
        PR-050 follow-up — the page now reads as one intelligence-report
        narrative (Header → Project Summary → Why It Matters → Health &
        Trust → Evidence & Sources → Recent Highlights → Timeline → Token
        & Price → Metrics → Community → AI Intelligence → Contracts →
        Governance) instead of PR13.3's "widget grid" ordering. Every
        section still receives the exact same `profile.*`/`intelligenceReport`
        fields it always did — this is a render-order change only, no new
        provider call, no new calculation.
      */}
      <ProfileSummary thesis={intelligenceReport.thesis} />

      <ProfileWhyItMatters highlights={intelligenceReport.highlights} />

      <ProfileTrustCenter
        verificationStatus={profile.community.verificationStatus}
        confidence={profile.confidence}
        contracts={profile.contracts}
        sources={profile.sources}
        github={profile.github}
        githubConfigured={githubConfigured}
        websiteUrl={profile.identity.websiteUrl}
        docsUrl={profile.community.socials.docs ?? null}
        communityLinkCount={communityLinkCount}
        communityLinkTotal={communityLinkTotal}
      />

      <ProfileExecutiveIntelligence
        report={intelligenceReport}
        freshness={profile.freshness}
        sources={profile.sources}
        verificationStatus={profile.community.verificationStatus}
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

      <ProfileSources sources={profile.sources} thingsWeCouldntVerify={intelligenceReport.thingsWeCouldntVerify} />

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
        githubConfigured={githubConfigured}
      />

      <ProfileCommunityMetrics
        github={profile.github}
        community={profile.community}
        contributorCountPromise={contributorCountPromise}
        githubConfigured={githubConfigured}
      />

      <ProfileIntelligence narrative={profile.narrative} risk={profile.risk} health={profile.health} confidence={profile.confidence} />

      {aiIntelligence && (
        <ProfileIntelligencePanel
          registry={aiIntelligence.registry}
          latest={latestIntelligence}
          related={relatedIntelligence}
          evidenceSummary={aiIntelligence.evidenceSummary}
          sources={aiIntelligence.sources}
        />
      )}

      <ProfileContracts contracts={profile.contracts} chain={profile.chain} contractDetailsPromise={contractDetailsPromise} />

      <ProfileGovernance governance={profile.governance} governanceUrl={profile.community.governanceUrl} />

      {primaryCategory && (
        <ProfileRelatedProjects currentProjectId={registryProject.id} category={primaryCategory} tags={profile.identity.tags} />
      )}
    </div>
  );
}
