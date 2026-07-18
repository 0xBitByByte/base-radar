import {
  getActivityFeed,
  getAIProjects,
  getIntelligenceBrief,
  getKpis,
  getMarketOverview,
  getNarrativeHeatmap,
  getPortfolioSummary,
  getProjectSpotlight,
  getSignals,
  getTrendingNarratives,
  getWhaleEvents,
} from "@/lib/data/aggregate";
import { getAllProjectIntelligence } from "@/lib/intelligence/engine";
import { AIIntelligenceWidget } from "@/components/dashboard/AIIntelligenceWidget";
import { BriefWidget } from "@/components/brief/BriefWidget";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { IntelligenceBrief } from "@/components/dashboard/IntelligenceBrief";
import { KPIRow } from "@/components/dashboard/KPIRow";
import { PortfolioWidget } from "@/components/dashboard/PortfolioWidget";
import { MarketWidgetLive } from "@/components/dashboard/MarketWidgetLive";
import { TrendingWidget } from "@/components/dashboard/TrendingWidget";
import { AIProjectsWidget } from "@/components/dashboard/AIProjectsWidget";
import { WhaleActivityWidget } from "@/components/dashboard/WhaleActivityWidget";
import { SignalsWidget } from "@/components/dashboard/SignalsWidget";
import { NarrativeHeatmap } from "@/components/dashboard/NarrativeHeatmap";
import { ProjectSpotlight } from "@/components/dashboard/ProjectSpotlight";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { WatchlistWidget } from "@/components/dashboard/WatchlistWidget";

/**
 * `async` at the top level (PR9.5.2) — awaiting every critical widget's
 * data directly in the page component, with no inner `<Suspense>` split,
 * is what makes this route's own `loading.tsx` (the shared `BrandSpinner`
 * fallback, identical to `/dashboard/projects/loading.tsx`) actually fire
 * during navigation: Next.js only shows a route's `loading.tsx` while that
 * route's top-level render is genuinely suspended, and a nested Suspense
 * boundary (the previous PR9.5 §4 approach) catches its own suspension
 * locally, so it never bubbles up to the route boundary above it. This
 * mirrors `app/dashboard/projects/page.tsx`'s `ExplorerPage` exactly, so
 * `/dashboard` gets the identical premium loading experience Projects
 * already had — same spinner, same timing, held for exactly as long as
 * the data genuinely takes, never a moment longer.
 */
export default async function DashboardPage() {
  const lastUpdated = new Date().toISOString();

  const [
    brief,
    kpis,
    portfolio,
    market,
    trending,
    aiProjects,
    whaleEvents,
    signals,
    heatmap,
    spotlight,
    activity,
    allProjects,
  ] = await Promise.all([
    getIntelligenceBrief(),
    getKpis(),
    getPortfolioSummary(),
    getMarketOverview(),
    getTrendingNarratives(),
    getAIProjects(),
    getWhaleEvents(),
    getSignals(),
    getNarrativeHeatmap(),
    getProjectSpotlight(),
    getActivityFeed(),
    getAllProjectIntelligence(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <WelcomeHeader />

      <div className="flex flex-col gap-8 [animation:br-dashboard-reveal_400ms_ease-out] motion-reduce:animate-none">
        <IntelligenceBrief data={brief} />

        <KPIRow items={kpis.items} lastUpdated={lastUpdated} />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <PortfolioWidget data={portfolio} lastUpdated={lastUpdated} />
          <MarketWidgetLive data={market} lastUpdated={lastUpdated} />
          <TrendingWidget data={trending} lastUpdated={lastUpdated} />
          <AIProjectsWidget data={aiProjects} lastUpdated={lastUpdated} />
          <WhaleActivityWidget data={whaleEvents} lastUpdated={lastUpdated} />
          <SignalsWidget data={signals} lastUpdated={lastUpdated} />
          <NarrativeHeatmap data={heatmap} lastUpdated={lastUpdated} />
          <ProjectSpotlight data={spotlight} lastUpdated={lastUpdated} />
          <ActivityFeed data={activity} lastUpdated={lastUpdated} />
          <WatchlistWidget projects={allProjects} lastUpdated={lastUpdated} />
          <AIIntelligenceWidget />
          <BriefWidget />
        </div>
      </div>
    </div>
  );
}
