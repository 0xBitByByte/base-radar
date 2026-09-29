import { ProjectsAllClient } from "@/components/projects/ProjectsAllClient";
import { buildViewMetadata } from "@/components/projects/viewMeta";
import { getCachedLiveProjects } from "@/lib/data/projectSubpageCache";
import { toPublicLiveProjects } from "@/lib/projects/publicSerialization";

const VIEW = "all" as const;

export const metadata = buildViewMetadata(VIEW);

/**
 * Vercel production-hotspot follow-up — confirmed ~102.9k requests/30d,
 * always `x-vercel-cache: MISS` in production, listed in `sitemap.xml`
 * with `changeFrequency: "hourly"`. See `app/dashboard/projects/page.tsx`'s
 * own doc comment for the full D2-prototype rationale — same fix here.
 *
 * This route previously rendered via the shared `renderProjectsCollectionRoute()`
 * helper (`components/projects/renderProjectsCollectionRoute.tsx`), which
 * reads `searchParams` server-side — that helper is deliberately left
 * untouched (it's still used, unchanged, by the 11 OTHER dedicated
 * collection routes: `/verified`, `/trending`, `/blue-chips`, etc., none of
 * which were in scope for this fix). This route instead composes
 * `ProjectsAllClient` directly, which reuses every presentational piece
 * the shared helper does — just with client-side filtering instead of a
 * server `searchParams` read.
 */
export const revalidate = 300;

export default async function AllProjectsPage() {
  const projects = await getCachedLiveProjects();
  // Public payload audit follow-up — see lib/projects/publicSerialization.ts.
  return <ProjectsAllClient projects={toPublicLiveProjects(projects)} />;
}
