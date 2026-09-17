import type { Metadata } from "next";

import { getRawWhaleEvents } from "@/lib/data/aggregate";
import { getLiveProjects } from "@/lib/projects/service";
import { evaluateServerCollections } from "@/lib/smart-collections/aggregate";
import { SmartCollectionsIndexView } from "@/components/collections/SmartCollectionsIndexView";

export const metadata: Metadata = {
  title: "Smart Collections",
  description: "Discover Base ecosystem projects through Base Radar's own intelligence — AI Grade, Risk, Confidence, on-chain and GitHub activity — grouped into ten evidence-backed collections.",
};

/**
 * PR-090.04 (Smart Collections) — awaits the two real, already-`cache()`-wrapped
 * server sources exactly once (`getLiveProjects()`, the same registry+intelligence+discovery
 * blend `/dashboard/projects` itself reads through `loadProjectsPageData()`;
 * `getRawWhaleEvents()`, the same whale-detection pass the Project Profile
 * page and dashboard widget already share) and evaluates the 7
 * server-only collections here, server-side — never re-fetched or
 * re-derived client-side. Only the resulting matches (a small subset) are
 * sent to the client, not the full ~1,000-project registry.
 */
export default async function SmartCollectionsPage() {
  const [liveProjects, whaleEvents] = await Promise.all([getLiveProjects(), getRawWhaleEvents()]);
  const serverResults = evaluateServerCollections(liveProjects, whaleEvents, new Date().toISOString());
  return <SmartCollectionsIndexView serverResults={serverResults} />;
}
