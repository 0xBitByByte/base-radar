import { renderProjectsCollectionRoute } from "@/components/projects/renderProjectsCollectionRoute";
import type { RawSearchParams } from "@/components/projects/queryState";
import { buildViewMetadata } from "@/components/projects/viewMeta";

const VIEW = "all" as const;

export const metadata = buildViewMetadata(VIEW);

type PageProps = { searchParams: Promise<RawSearchParams> };

/**
 * PR-085.04 — the dedicated "All Projects" route: search, filter, sort,
 * financial summary, the complete directory, and pagination — exactly what
 * `app/dashboard/projects/page.tsx`'s old third Suspense boundary rendered
 * inline, now its own destination. Same shared pipeline every other
 * collection route already calls (`renderProjectsCollectionRoute`) — no new
 * data-fetch, no new component.
 */
export default async function AllProjectsPage({ searchParams }: PageProps) {
  const rawSearchParams = await searchParams;
  return renderProjectsCollectionRoute(VIEW, rawSearchParams);
}
