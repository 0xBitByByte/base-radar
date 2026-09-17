import type { Metadata } from "next";

import {
  getActivityFeed,
  getDashboardIntelligenceBrief,
  getExecutiveSnapshot,
  getKpis,
  getMarketOverview,
  getNarrativeHeatmap,
  getSignals,
  getTrendingNarratives,
  getWhaleEvents,
} from "@/lib/data/aggregate";
import { getLiveProjects } from "@/lib/projects/service";
import { AIIntelligenceWidget } from "@/components/dashboard/AIIntelligenceWidget";
import { BriefWidget } from "@/components/brief/BriefWidget";
import { PortfolioWidget as PortfolioIntelligenceWidget } from "@/components/portfolio/PortfolioWidget";
import { TimelineWidget } from "@/components/timeline/TimelineWidget";
import { NotificationWidget } from "@/components/notifications/NotificationWidget";
import { AutomationWidget } from "@/components/automation/AutomationWidget";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { ExecutiveSummaryStrip } from "@/components/dashboard/ExecutiveSummaryStrip";
import { TodaysTopInsight } from "@/components/dashboard/TodaysTopInsight";
import { GettingStartedCard } from "@/components/dashboard/GettingStartedCard";
import { DashboardSectionLabel } from "@/components/dashboard/DashboardSectionLabel";
import { IntelligenceBrief } from "@/components/dashboard/IntelligenceBrief";
import { KPIRow } from "@/components/dashboard/KPIRow";
import { PortfolioWidget } from "@/components/dashboard/PortfolioWidget";
import { MarketWidgetLive } from "@/components/dashboard/MarketWidgetLive";
import { TrendingWidget } from "@/components/dashboard/TrendingWidget";
import { AIProjectsWidget } from "@/components/dashboard/AIProjectsWidget";
import { WhaleActivityWidget } from "@/components/dashboard/WhaleActivityWidget";
import { EcosystemOpportunitiesWidget } from "@/components/dashboard/EcosystemOpportunitiesWidget";
import { EcosystemRisksWidget } from "@/components/dashboard/EcosystemRisksWidget";
import { getProjectLogoMap } from "@/lib/branding/resolveProjectLogos";
import { SignalsWidget } from "@/components/dashboard/SignalsWidget";
import { NarrativeHeatmap } from "@/components/dashboard/NarrativeHeatmap";
import { ProjectSpotlight } from "@/components/dashboard/ProjectSpotlight";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { WatchlistWidget } from "@/components/dashboard/WatchlistWidget";
import { AIIntelligenceHubStrip } from "@/components/dashboard/AIIntelligenceHubStrip";
import { HideableWidget } from "@/components/dashboard/HideableWidget";

export const metadata: Metadata = { title: "Dashboard" };

const WIDGET_GRID_CLASS = "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3";

/**
 * `async` at the top level (PR9.5.2) — awaiting every critical widget's
 * data directly in the page component, with no inner `<Suspense>` split,
 * is what makes this route's own `loading.tsx` (PR-065's `BrandLoader`,
 * identical to `/dashboard/projects/loading.tsx`) actually fire during
 * navigation: Next.js only shows a route's `loading.tsx` while that route's
 * top-level render is genuinely suspended, and a nested Suspense boundary
 * (the previous PR9.5 §4 approach) catches its own suspension locally, so
 * it never bubbles up to the route boundary above it. This mirrors
 * `app/dashboard/projects/page.tsx`'s `ExplorerPage` exactly, so
 * `/dashboard` gets the identical premium loading experience Projects
 * already had — same loader, same timing, held for exactly as long as
 * the data genuinely takes, never a moment longer.
 */
export default async function DashboardPage() {
  const lastUpdated = new Date().toISOString();

  const [
    brief,
    kpis,
    market,
    trending,
    liveProjects,
    whaleEvents,
    signals,
    heatmap,
    activity,
    executiveSnapshot,
    projectLogos,
  ] = await Promise.all([
    getDashboardIntelligenceBrief(),
    getKpis(),
    getMarketOverview(),
    getTrendingNarratives(),
    getLiveProjects(),
    getWhaleEvents(),
    getSignals(),
    getNarrativeHeatmap(),
    getActivityFeed(),
    getExecutiveSnapshot(),
    getProjectLogoMap(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <WelcomeHeader />

      <div className="flex flex-col gap-8 [animation:br-dashboard-reveal_400ms_ease-out] motion-reduce:animate-none">
        <ExecutiveSummaryStrip kpis={kpis.items} snapshot={executiveSnapshot} heatmap={heatmap} />

        {/* UX Polish, Phase 3 — ecosystem-wide, so it's real for a brand-new
            user with an empty Watchlist too, unlike every Tier 1 widget
            below. Placed right after the Executive Summary strip: both are
            "what matters today" surfaces, this one is just the single most
            important story instead of the aggregate stats. */}
        <TodaysTopInsight logoMap={projectLogos} />

        <GettingStartedCard />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <IntelligenceBrief
            data={brief}
            sources={brief.sources}
            evidenceSummary={brief.evidenceSummary}
            className="lg:col-span-2"
          />
          {/* PR-047 — relocated from the Tier 3 grid below: surfaced beside
              the Brief instead of leaving that row's large empty area
              unused, and instead of scrolling past 11 other widgets to
              reach it.
              V3-WALLET-002 — now backed by real wallet holdings
              (`usePortfolio()`) instead of the previous permanent
              placeholder; owns its own data end to end, so it no longer
              takes `data`/`lastUpdated` props the way the old mock-fed
              version did. */}
          <PortfolioWidget />
        </div>

        <KPIRow items={kpis.items} lastUpdated={lastUpdated} />

        <AIIntelligenceHubStrip />

        {/* Tier 1 — personalized, watchlist-scoped intelligence: the most
            decision-relevant content on the page, so it leads (PR-008). */}
        <div className="flex flex-col gap-3">
          <DashboardSectionLabel
            title="Your Intelligence"
            subtitle="Personalized to the projects in your Watchlist"
          />
          <div className={WIDGET_GRID_CLASS} aria-label="Your Intelligence">
            <HideableWidget id="ai-intelligence">
              <AIIntelligenceWidget />
            </HideableWidget>
            <HideableWidget id="brief">
              <BriefWidget />
            </HideableWidget>
            <HideableWidget id="portfolio-intelligence">
              <PortfolioIntelligenceWidget />
            </HideableWidget>
            <HideableWidget id="watchlist">
              <WatchlistWidget liveProjects={liveProjects} lastUpdated={lastUpdated} />
            </HideableWidget>
            <HideableWidget id="notifications">
              <NotificationWidget />
            </HideableWidget>
            <HideableWidget id="automation">
              <AutomationWidget />
            </HideableWidget>
            <HideableWidget id="timeline">
              <TimelineWidget />
            </HideableWidget>
          </div>
        </div>

        {/* Tier 2 — ecosystem-wide market-moving signals. */}
        <div className="flex flex-col gap-3">
          <DashboardSectionLabel
            title="Market Signals"
            subtitle="Ecosystem-wide activity across all of Base, not just your Watchlist"
          />
          <div className={WIDGET_GRID_CLASS} aria-label="Market Signals">
            {/* PR-085.02 — ecosystem-wide Opportunities/Risks, the one
                genuinely new capability this pass adds: same
                `buildTopOpportunities()`/`buildTopRisks()` pure builders
                `BriefWidget` (Tier 1, above) already uses, just fed the
                ecosystem-wide alert set instead of the Watchlist-scoped
                one. Belongs in this tier, not Tier 1 — it's explicitly
                ecosystem-wide, matching this tier's own subtitle. */}
            <HideableWidget id="ecosystem-opportunities">
              <EcosystemOpportunitiesWidget logoMap={projectLogos} />
            </HideableWidget>
            <HideableWidget id="ecosystem-risks">
              <EcosystemRisksWidget logoMap={projectLogos} />
            </HideableWidget>
            <HideableWidget id="whale-activity">
              <WhaleActivityWidget data={whaleEvents} lastUpdated={lastUpdated} />
            </HideableWidget>
            <HideableWidget id="signals">
              <SignalsWidget data={signals} lastUpdated={lastUpdated} />
            </HideableWidget>
            <HideableWidget id="market">
              <MarketWidgetLive data={market} lastUpdated={lastUpdated} />
            </HideableWidget>
            <HideableWidget id="narrative-heatmap">
              <NarrativeHeatmap data={heatmap} lastUpdated={lastUpdated} />
            </HideableWidget>
            <HideableWidget id="trending">
              <TrendingWidget data={trending} lastUpdated={lastUpdated} />
            </HideableWidget>
          </div>
        </div>

        {/* Tier 3 — supplementary/informational. Portfolio moved above,
            beside the Intelligence Brief (PR-047). */}
        <div className="flex flex-col gap-3">
          <DashboardSectionLabel
            title="Ecosystem Overview"
            subtitle="Supplementary context — featured projects and recent events"
          />
          <div className={WIDGET_GRID_CLASS} aria-label="Ecosystem Overview">
            <HideableWidget id="ai-projects">
              <AIProjectsWidget liveProjects={liveProjects} lastUpdated={lastUpdated} />
            </HideableWidget>
            <HideableWidget id="project-spotlight">
              <ProjectSpotlight liveProjects={liveProjects} lastUpdated={lastUpdated} />
            </HideableWidget>
            <HideableWidget id="activity-feed">
              <ActivityFeed data={activity} lastUpdated={lastUpdated} />
            </HideableWidget>
          </div>
        </div>
      </div>
    </div>
  );
}
