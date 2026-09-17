import type { Metadata } from "next";

import { DailyBrief } from "@/components/brief/DailyBrief";
import { getProjectLogoMap } from "@/lib/branding/resolveProjectLogos";

export const metadata: Metadata = {
  title: "Daily Brief",
  description: "An AI-generated executive summary of today's Intelligence Alerts across your Watchlist.",
};

/**
 * PR16 — this route still renders the Daily Brief engine entirely
 * client-side (`DailyBrief`): no server fetch, no rebuilding it here.
 * `useDailyBrief()` reads the same runtime-cached `getDailyBrief()` the
 * Dashboard's `BriefWidget` reads from, so both surfaces always agree.
 *
 * Project Logo System — `getProjectLogoMap()` needs an async server call,
 * so it's fetched here and passed down rather than resolved client-side.
 */
export default async function BriefPage() {
  const logoMap = await getProjectLogoMap();
  return <DailyBrief logoMap={logoMap} />;
}
