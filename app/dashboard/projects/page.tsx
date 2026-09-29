import type { Metadata } from "next";

import { ProjectsDiscoverClient } from "@/components/projects/ProjectsDiscoverClient";
import { PROJECTS_PATH } from "@/components/projects/queryState";
import { getCachedLiveProjects } from "@/lib/data/projectSubpageCache";
import { toPublicLiveProjects } from "@/lib/projects/publicSerialization";

export const metadata: Metadata = {
  title: "Projects",
  // PR-085.04 — this page is Discover only now; "every... project" moved
  // to `/dashboard/projects/all` and has its own accurate description there.
  description: "Discover the Base ecosystem — verified, trending, and newly surfaced projects, curated in one place.",
  alternates: { canonical: PROJECTS_PATH },
};

/**
 * Vercel production-hotspot follow-up — confirmed ~58.6k requests/30d,
 * always `x-vercel-cache: MISS` in production, listed in `sitemap.xml`
 * with `changeFrequency: "hourly"`.
 *
 * D2 prototype: static/ISR server shell + client-side filtering. This page
 * used to read `searchParams` server-side (via `buildDirectoryPipeline()`),
 * which alone forced it fully dynamic regardless of any data-layer
 * caching — confirmed empirically with an isolated diagnostic route (a
 * bare page reading only `searchParams`, nothing else, still classified
 * `ƒ`). Since every one of this page's `searchParams` uses was already
 * confirmed presentation-only (filtering/sorting/pagination over data
 * that's already fully loaded, never a second fetch), the fix is to stop
 * reading `searchParams` server-side at all: this page now fetches the
 * full, public `LiveProject[]` dataset once (`getCachedLiveProjects()`,
 * PR #73's own cached function — untouched), and hands it to
 * `ProjectsDiscoverClient` (`"use client"`), which computes everything
 * (hero counts, curated rails, category state) from that already-shipped
 * array and owns the URL itself via `history.pushState`/`popstate`
 * (`lib/hooks/useProjectsQueryState.ts`) — no further server round-trip
 * for any interaction. No `[slug]` dynamic segment here, so
 * `generateStaticParams` isn't applicable (see the PR #73 project routes
 * for that mechanism) — a plain route with no `searchParams` dependency is
 * ISR-eligible on `revalidate` alone.
 */
export const revalidate = 300;

export default async function ProjectsPage() {
  const projects = await getCachedLiveProjects();
  // Public payload audit follow-up — see lib/projects/publicSerialization.ts.
  // Redacts internal Discovery Engine duplicate-match audit data before
  // this array is handed to a "use client" component (i.e. before it's
  // serialized into the public HTML payload). The original, un-redacted
  // `projects` above is never mutated or reused after this line.
  return <ProjectsDiscoverClient projects={toPublicLiveProjects(projects)} />;
}
