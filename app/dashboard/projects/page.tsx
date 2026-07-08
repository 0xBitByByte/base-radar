import type { Metadata } from "next";

import { getAllProjectIntelligence } from "@/lib/intelligence/engine";
import { ExplorerPageClient } from "@/components/explorer/ExplorerPageClient";
import { ExplorerEmptyState } from "@/components/explorer/ExplorerEmptyState";
import { ExplorerErrorState } from "@/components/explorer/ExplorerErrorState";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

export const metadata: Metadata = {
  title: "Projects — Base Radar",
  description: "Browse every project in the Base Radar Project Registry.",
};

/**
 * The Explorer Shell (Milestone 7, PR1). The only component in this feature
 * that calls into the Project Intelligence Engine — every component under
 * `components/explorer/` only ever receives already-resolved
 * `ProjectIntelligence[]` as props, per docs/explorer/05 §16/§18.
 */
export default async function ExplorerPage() {
  let projects: ProjectIntelligence[];
  try {
    projects = await getAllProjectIntelligence();
  } catch {
    return <ExplorerErrorState />;
  }

  if (projects.length === 0) {
    return <ExplorerEmptyState />;
  }

  const generatedAt = projects[0].metadata.generatedAt;

  return <ExplorerPageClient projects={projects} generatedAt={generatedAt} />;
}
