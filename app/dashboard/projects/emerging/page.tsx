import type { Metadata } from "next";

import { renderProjectsCollectionRoute } from "@/components/projects/renderProjectsCollectionRoute";
import type { RawSearchParams } from "@/components/projects/queryState";
import { PROJECTS_VIEW_META } from "@/components/projects/viewMeta";

const VIEW = "emerging" as const;

export const metadata: Metadata = {
  title: `${PROJECTS_VIEW_META[VIEW].title} | Projects`,
  description: PROJECTS_VIEW_META[VIEW].description ?? PROJECTS_VIEW_META[VIEW].title,
};

type PageProps = { searchParams: Promise<RawSearchParams> };

/** PR-061 — Task 2 & 7: dedicated collection route for "emerging" — see `renderProjectsCollectionRoute` for the shared pipeline every route in this family calls. */
export default async function EmergingPage({ searchParams }: PageProps) {
  const rawSearchParams = await searchParams;
  return renderProjectsCollectionRoute(VIEW, rawSearchParams);
}
