import { getDashboardData } from "@/lib/data/aggregate";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { IntelligenceBrief } from "@/components/dashboard/IntelligenceBrief";
import { KPIRow } from "@/components/dashboard/KPIRow";
import { PortfolioWidget } from "@/components/dashboard/PortfolioWidget";
import { MarketWidget } from "@/components/dashboard/MarketWidget";
import { TrendingWidget } from "@/components/dashboard/TrendingWidget";
import { AIProjectsWidget } from "@/components/dashboard/AIProjectsWidget";
import { WhaleActivityWidget } from "@/components/dashboard/WhaleActivityWidget";
import { SignalsWidget } from "@/components/dashboard/SignalsWidget";
import { NarrativeHeatmap } from "@/components/dashboard/NarrativeHeatmap";
import { ProjectSpotlight } from "@/components/dashboard/ProjectSpotlight";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { WatchlistWidget } from "@/components/dashboard/WatchlistWidget";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const generatedAt = new Date().toISOString();

  return (
    <div className="flex flex-col gap-8">
      <WelcomeHeader />

      <IntelligenceBrief data={data.brief} />

      <KPIRow items={data.kpis.items} lastUpdated={generatedAt} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <PortfolioWidget data={data.portfolio} lastUpdated={generatedAt} />
        <MarketWidget data={data.market} lastUpdated={generatedAt} />
        <TrendingWidget data={data.narratives} lastUpdated={generatedAt} />
        <AIProjectsWidget data={data.aiProjects} lastUpdated={generatedAt} />
        <WhaleActivityWidget data={data.whaleEvents} lastUpdated={generatedAt} />
        <SignalsWidget data={data.signals} lastUpdated={generatedAt} />
        <NarrativeHeatmap data={data.heatmap} lastUpdated={generatedAt} />
        <ProjectSpotlight data={data.spotlight} lastUpdated={generatedAt} />
        <ActivityFeed data={data.activity} lastUpdated={generatedAt} />
        <WatchlistWidget data={data.watchlist} lastUpdated={generatedAt} />
      </div>
    </div>
  );
}
