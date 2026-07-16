import { notFound } from "next/navigation";

import { getProject } from "@/data/projects/helpers";
import { getRawWhaleEvents, getSignals } from "@/lib/data/aggregate";
import { getProjectIntelligence } from "@/lib/intelligence/engine";
import { buildAiInsight, buildAiVerdict, buildExecutiveSummaryBullets, buildHealthScorecard } from "@/lib/intelligence/scorecard";
import { buildProjectTimeline } from "@/lib/intelligence/timeline";
import * as blockscout from "@/lib/providers/blockscout/service";
import * as defillama from "@/lib/providers/defillama/service";
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
import type { TokenTransfer } from "@/lib/providers/blockscout/service";

type ProjectProfilePageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * The Project Profile route (PR11) — the "complete research experience"
 * `QuickViewDrawer`'s own doc comment already names as a future milestone.
 * `async`, awaits everything at the top level via one `Promise.allSettled`
 * (no inner Suspense split), matching `app/dashboard/page.tsx`'s and
 * `app/dashboard/projects/page.tsx`'s established pattern so this route's
 * own `loading.tsx` genuinely fires while data is in flight. Whale events
 * and signals are the exact same `cache()`-wrapped, ecosystem-wide batch
 * results `lib/data/aggregate.ts` already computes for the dashboard —
 * filtered down to this one project here, never re-detected.
 */
export default async function ProjectProfilePage({ params }: ProjectProfilePageProps) {
  const { slug } = await params;

  const registryProject = getProject(slug);
  if (!registryProject) notFound();

  const [profileRes, whaleRes, signalsRes, tvlHistoryRes] = await Promise.allSettled([
    getProjectIntelligence(slug),
    getRawWhaleEvents(),
    getSignals(),
    registryProject.providerIds.defillamaSlug
      ? defillama.getProtocolTvlHistory(registryProject.providerIds.defillamaSlug)
      : Promise.resolve(null),
  ]);

  const profile = profileRes.status === "fulfilled" ? profileRes.value : null;
  if (!profile) notFound();

  // Real per-token-contract transfer feed (PR12.1c Req 5.5) — Blockscout's
  // `getTokenTransfers` was previously only used for whale detection.
  // Base-only (Blockscout's Base instance has no cross-chain data), and only
  // fetched when this project actually has a token contract configured on
  // its primary chain.
  const tokenContract = profile.contracts.items.find(
    (item) => item.chain === profile.chain.primaryChain && item.type === "token"
  );
  const transfersResult =
    tokenContract && profile.chain.primaryChain === "base"
      ? await blockscout.getTokenTransfers(tokenContract.address)
      : null;
  const recentTransfers: TokenTransfer[] | null = transfersResult?.ok ? transfersResult.data : null;
  const recentTransfersUnavailableReason = !tokenContract
    ? "No token contract is configured for this project on its primary chain."
    : profile.chain.primaryChain !== "base"
      ? "Recent transfers are only available for projects with a token contract on Base."
      : transfersResult && !transfersResult.ok
        ? transfersResult.error.message
        : "No recent transfer data was returned by Blockscout.";

  const allWhaleEvents = whaleRes.status === "fulfilled" ? whaleRes.value : [];
  const whaleEvents = allWhaleEvents.filter((event) => event.projectId === profile.identity.id);

  const allSignals = signalsRes.status === "fulfilled" ? signalsRes.value : [];
  const signals = allSignals.filter(
    (signal) => signal.project.toLowerCase() === profile.identity.name.toLowerCase()
  );

  const tvlHistoryResult = tvlHistoryRes.status === "fulfilled" ? tvlHistoryRes.value : null;
  const tvlHistory: SparklinePoint[] | null = tvlHistoryResult?.ok ? tvlHistoryResult.data : null;

  const priceHistory: SparklinePoint[] | null =
    profile.market.sparkline7d.length > 0
      ? profile.market.sparkline7d.map((price, index) => ({ t: index, v: price }))
      : null;

  const timeline = buildProjectTimeline({
    github: profile.github,
    governanceEvents: profile.governance ?? [],
    whaleEvents,
    signals,
    tvl: profile.tvl,
    risk: profile.risk,
    tokenTransfers: recentTransfers,
    tokenSymbol: profile.market.symbol,
  });

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
            market={profile.market}
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
            tvlHistory={tvlHistory}
            defillamaSlug={registryProject.providerIds.defillamaSlug ?? null}
            recentTransfers={recentTransfers}
            recentTransfersUnavailableReason={recentTransfersUnavailableReason}
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
            timelineEvents={timeline}
          />
        </div>
      </div>
    </div>
  );
}
