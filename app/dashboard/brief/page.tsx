import type { Metadata } from "next";

import { DailyBrief } from "@/components/brief/DailyBrief";

export const metadata: Metadata = {
  title: "Daily Brief",
  description: "An AI-generated executive summary of today's Intelligence Alerts across your Watchlist.",
};

/**
 * PR16 — this route renders entirely client-side (`DailyBrief`): no server
 * fetch, no rebuilding the Daily Brief engine here. `useDailyBrief()` reads
 * the same runtime-cached `getDailyBrief()` the Dashboard's `BriefWidget`
 * reads from, so both surfaces always agree.
 */
export default function BriefPage() {
  return <DailyBrief />;
}
