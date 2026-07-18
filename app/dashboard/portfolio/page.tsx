import type { Metadata } from "next";

import { PortfolioOverview } from "@/components/portfolio/PortfolioOverview";

export const metadata: Metadata = {
  title: "Portfolio Intelligence",
  description: "AI-derived intelligence across your Watchlist — health, top performers, risks, and recommendations.",
};

/**
 * PR17 — this route renders entirely client-side (`PortfolioOverview`): no
 * server fetch, no rebuilding Portfolio Intelligence here.
 * `usePortfolioIntelligence()` reads the same runtime-cached
 * `getPortfolioIntelligence()` the Dashboard's `PortfolioWidget`
 * (`components/portfolio/PortfolioWidget.tsx`) reads from, so both
 * surfaces always agree.
 */
export default function PortfolioPage() {
  return <PortfolioOverview />;
}
