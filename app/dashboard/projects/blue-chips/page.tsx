import { renderProjectsCollectionRoute } from "@/components/projects/renderProjectsCollectionRoute";
import type { RawSearchParams } from "@/components/projects/queryState";
import { buildViewMetadata } from "@/components/projects/viewMeta";

const VIEW = "blueChips" as const;

export const metadata = buildViewMetadata(VIEW);

type PageProps = { searchParams: Promise<RawSearchParams> };

/** PR-061 — Task 2 & 7: dedicated collection route for "blueChips" — see `renderProjectsCollectionRoute` for the shared pipeline every route in this family calls. */
export default async function BlueChipsPage({ searchParams }: PageProps) {
  const rawSearchParams = await searchParams;
  return renderProjectsCollectionRoute(VIEW, rawSearchParams);
}
