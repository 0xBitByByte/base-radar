import { renderProjectsCollectionRoute } from "@/components/projects/renderProjectsCollectionRoute";
import type { RawSearchParams } from "@/components/projects/queryState";
import { buildViewMetadata } from "@/components/projects/viewMeta";

const VIEW = "new" as const;

export const metadata = buildViewMetadata(VIEW);

type PageProps = { searchParams: Promise<RawSearchParams> };

/** PR-061 — Task 2 & 7: dedicated collection route for "new" — see `renderProjectsCollectionRoute` for the shared pipeline every route in this family calls. */
export default async function NewPage({ searchParams }: PageProps) {
  const rawSearchParams = await searchParams;
  return renderProjectsCollectionRoute(VIEW, rawSearchParams);
}
