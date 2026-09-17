import type { Metadata } from "next";

import { getCurrentDailyIntelligenceBriefing, getRawWhaleEvents } from "@/lib/data/aggregate";
import { getLiveProjects } from "@/lib/projects/service";
import { evaluateServerCollections } from "@/lib/smart-collections/aggregate";
import { ReportsIndexView } from "@/components/reports/ReportsIndexView";

export const metadata: Metadata = {
  title: "AI Executive Reports",
  description: "Executive-level Daily Brief, Weekly, Monthly, Market Outlook, Ecosystem, and Opportunity reports, generated from Base Radar's own real intelligence.",
};

/**
 * PR-090.05 (AI Executive Reports) — awaits the same three real,
 * `cache()`-wrapped server sources AI Workspace and Smart Collections
 * already read (`getCurrentDailyIntelligenceBriefing()`, `getLiveProjects()`,
 * `getRawWhaleEvents()`) exactly once, and reuses Smart Collections' own
 * `evaluateServerCollections()` verbatim for the 7 server-evaluated
 * collections — never a second computation of any of them.
 */
export default async function ExecutiveReportsPage() {
  const [initialBriefing, liveProjects, whaleEvents] = await Promise.all([getCurrentDailyIntelligenceBriefing(), getLiveProjects(), getRawWhaleEvents()]);
  const serverSmartCollections = evaluateServerCollections(liveProjects, whaleEvents, new Date().toISOString());
  return <ReportsIndexView initialBriefing={initialBriefing} serverSmartCollections={serverSmartCollections} />;
}
