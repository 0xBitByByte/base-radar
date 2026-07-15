import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { FeaturedEcosystem } from "@/components/landing/FeaturedEcosystem";
import { KeyMetrics } from "@/components/landing/KeyMetrics";
import { AIIntelligencePreview } from "@/components/landing/AIIntelligencePreview";
import { WhyBaseRadar } from "@/components/landing/WhyBaseRadar";
import { Roadmap } from "@/components/landing/Roadmap";
import { Features } from "@/components/landing/Features";
import { ClosingCTA } from "@/components/landing/ClosingCTA";
import { SectionDivider } from "@/components/landing/SectionDivider";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { TrustedDataSources } from "@/components/landing/TrustedDataSources";
import { getIntelligenceWallData } from "@/lib/data/aggregate";

export default async function Home() {
  const wallData = await getIntelligenceWallData();

  return (
    <div className="flex min-h-screen flex-col bg-radar-light-bg dark:bg-radar-bg">
      <Navbar />
      <ScrollProgress />
      <main className="flex-1">
        <Hero />
        <FeaturedEcosystem />
        <KeyMetrics />
        <SectionDivider />
        <AIIntelligencePreview wallData={wallData} />
        <SectionDivider />
        <WhyBaseRadar />
        <SectionDivider />
        <Roadmap />
        <SectionDivider />
        <TrustedDataSources />
        <SectionDivider />
        <Features />
        <ClosingCTA />
      </main>
      <Footer />
    </div>
  );
}
