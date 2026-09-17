import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { KeyMetrics } from "@/components/landing/KeyMetrics";
import { ProductProof } from "@/components/landing/ProductProof";
import { IntelligenceEngine } from "@/components/landing/IntelligenceEngine";
import { AICommandCenter } from "@/components/landing/AICommandCenter";
import { ProjectIntelligence } from "@/components/landing/ProjectIntelligence";
import { FeaturedEcosystem } from "@/components/landing/FeaturedEcosystem";
import { buildFeaturedProjectsWithSnapshot, FEATURED_PROJECT_IDS } from "@/components/landing/featuredProjects";
import { getFeaturedIntelligenceSnapshot } from "@/lib/data/featuredIntelligenceSnapshot";
import { WalletPortfolioIntelligence } from "@/components/landing/WalletPortfolioIntelligence";
import { IntelligenceWorkflow } from "@/components/landing/IntelligenceWorkflow";
import { TrustedDataSources } from "@/components/landing/TrustedDataSources";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { ClosingCTA } from "@/components/landing/ClosingCTA";
import { SectionDivider } from "@/components/landing/SectionDivider";
import { ScrollProgress } from "@/components/landing/ScrollProgress";

/**
 * PR-098.05 — Landing Page Intelligence Delivery Architecture. Revalidates
 * this route on a background timer (ISR) instead of it staying frozen
 * until the next deploy — see `lib/data/featuredIntelligenceSnapshot.ts`'s
 * doc comment for why this does NOT force the route into full request-time
 * dynamic rendering: the only data dependency this page has is the
 * `unstable_cache`-wrapped snapshot below, never a raw fetch in this
 * page's own render path. Confirm in `next build` output after any change
 * here that `/` still shows as prerendered with a Revalidate window, never
 * `ƒ (Dynamic)` — that would mean this property broke.
 *
 * PR-098.07 — must equal `FEATURED_INTELLIGENCE_REVALIDATE_SECONDS`
 * (`lib/data/featuredIntelligenceSnapshot.ts`) — kept as a literal here,
 * not a reference to that constant, because Next.js requires this export's
 * value to be statically analyzable (confirmed in
 * `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`:
 * "The revalidate value needs to be statically analyzable"). Was 1800
 * (30min, one flat window for every signal); now 180 (3min), matching the
 * fastest freshness class actually displayed — see the PR-098.07 report's
 * freshness matrix for why.
 */
export const revalidate = 180;

/**
 * Landing Page V2 — rebuilt information architecture around what Base
 * Radar actually is today (Executive Summary, AI Command Center, Project
 * Intelligence, Compare, Watchlists, Alerts, Wallet + Portfolio
 * Intelligence, AI Workspace, AI Reports, Automation), replacing the prior
 * narrower "AI-brief tool" positioning. Every section is either real
 * static registry data, clearly presentational fixture data shaped after
 * the real product (`constants/site.ts`'s `PREVIEW_*`/`TICKER_METRICS`
 * exports), or — PR-098.05 — the one shared, ISR-cached live intelligence
 * snapshot `FeaturedEcosystem` overlays onto its otherwise-illustrative
 * marquee. Every visitor within a given 3-minute window (PR-098.07) is
 * served the same prerendered HTML; none of them trigger a live provider
 * call themselves.
 */
export default async function Home() {
  const snapshot = await getFeaturedIntelligenceSnapshot(FEATURED_PROJECT_IDS);
  const featuredProjects = buildFeaturedProjectsWithSnapshot(snapshot);
  // PR-098.07 — real per-project freshness, keyed by id, for FeaturedEcosystem's "Updated Xm ago" tooltips.
  const featuredFreshnessById = Object.fromEntries(
    snapshot.entries.map((entry) => [entry.id, { tvl: entry.tvlFreshness, tokenChange: entry.tokenChangeFreshness }])
  );
  // PR-099 — real per-project live Radar Score, keyed by id.
  const featuredRadarScoreById = Object.fromEntries(snapshot.entries.map((entry) => [entry.id, entry.radarScore]));

  return (
    <div className="flex min-h-screen flex-col bg-radar-light-bg dark:bg-radar-bg">
      <Navbar />
      <ScrollProgress />
      <main className="flex-1">
        <Hero />
        <KeyMetrics />
        <SectionDivider />
        <ProductProof />
        <SectionDivider />
        <IntelligenceEngine />
        <SectionDivider />
        <AICommandCenter />
        <SectionDivider />
        <section id="projects" className="py-16 sm:py-24">
          <ProjectIntelligence />
          <FeaturedEcosystem projects={featuredProjects} freshnessById={featuredFreshnessById} radarScoreById={featuredRadarScoreById} />
        </section>
        <SectionDivider />
        <WalletPortfolioIntelligence />
        <SectionDivider />
        <IntelligenceWorkflow />
        <SectionDivider />
        <TrustedDataSources />
        <SectionDivider />
        <FeatureGrid />
        <ClosingCTA />
      </main>
      <Footer />
    </div>
  );
}
