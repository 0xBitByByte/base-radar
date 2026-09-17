import type { Metadata } from "next";

import { PortfolioOverview } from "@/components/portfolio/PortfolioOverview";
import { getProjectLogoMap } from "@/lib/branding/resolveProjectLogos";

export const metadata: Metadata = {
  title: "Portfolio Intelligence",
  description: "AI-derived intelligence across your Watchlist — health, top performers, risks, and recommendations.",
};

/**
 * PR17 — this route still renders its Portfolio Intelligence entirely
 * client-side (`PortfolioOverview`): no server fetch, no rebuilding
 * Portfolio Intelligence here. `usePortfolioIntelligence()` reads the same
 * runtime-cached `getPortfolioIntelligence()` the Dashboard's
 * `PortfolioWidget` (`components/portfolio/PortfolioWidget.tsx`) reads
 * from, so both surfaces always agree.
 *
 * Project Logo System — the one exception: `getProjectLogoMap()` (the
 * centralized, cached project-logo resolver) needs an async server call,
 * so it's fetched here and passed down as a prop rather than resolved
 * inside the client tree.
 */
export default async function PortfolioPage() {
  const logoMap = await getProjectLogoMap();
  return <PortfolioOverview logoMap={logoMap} />;
}
