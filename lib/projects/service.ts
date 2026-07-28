/**
 * PR-054 — the Live Projects Service. The single place that combines the
 * Project Registry, Provider Resolution, Project Intelligence (PR-052), and
 * Live Discovery (PR-053) into the unified `LiveProject[]` every future
 * Projects page, Dashboard widget, search feature, and API should consume.
 * No page should manually merge registry and discovery results — this
 * module is where that merge happens, once.
 *
 * Pipeline (Task 1):
 *
 *   Registry ──────────────┐
 *                          ├─▶ Provider Enrichment ─▶ Project Intelligence ─┐
 *   Discovery Sources ─▶ Registry Match ─▶ Classification ─▶ Confidence ────┼─▶ Live Project ─▶ Collections
 *                                                                            │
 *   (both branches run concurrently via Promise.all, then merged below) ────┘
 *
 * Merge rule: a `DiscoveryProject` whose `evidence.registryMatch.type` is
 * `"duplicate"|"updated"|"renamed"` refers, by `registryMatch.ts`'s own
 * design, to a *confirmed* existing registry project (`registryMatch.project`
 * is guaranteed non-null for these three types) — its discovery evidence is
 * folded into that registry project's `LiveProject`. A `DiscoveryProject`
 * whose match type is `"new"|"alias"|"needs-review"` is either genuinely new
 * or too weakly matched to trust automatically — it becomes its own
 * standalone, discovery-only `LiveProject` rather than being silently
 * attached to a possibly-wrong registry entry.
 *
 * Performance (Task 8): `getAllProjectIntelligence()` and
 * `runDiscoveryPipelineAgainstRegistry()` run concurrently via `Promise.all`
 * rather than sequentially, so their shared provider calls (e.g. CoinGecko's
 * Base-ecosystem market listing, now using one shared cache key — see
 * `BASE_ECOSYSTEM_MARKETS_PAGE_SIZE` in `lib/providers/coingecko/service.ts`)
 * land inside the same in-flight request window and de-duplicate through
 * `getOrSet()` instead of firing twice. Wrapped in React's `cache()` so a
 * single request's multiple readers (a page plus its streamed children)
 * share one computation.
 */

import { cache } from "react";

import { getProjects } from "@/data/projects/helpers";
import { getAllProjectIntelligence } from "@/lib/intelligence/engine";
import { runDiscoveryPipelineAgainstRegistry, type DiscoveryProject } from "@/lib/discovery/project";
import { buildLiveProjectFromDiscovery, buildLiveProjectFromIntelligence } from "@/lib/projects/build";
import type { LiveProject } from "@/lib/projects/types";

const FOLDED_MATCH_TYPES = new Set(["duplicate", "updated", "renamed"]);

/**
 * Builds every `LiveProject` for the current request — every registry
 * project (enriched with any matching discovery evidence this run) plus
 * every genuinely-standalone discovery-only project. Cached per-request via
 * `cache()`; call this rather than re-running the pipeline yourself.
 */
export const getLiveProjects = cache(async (): Promise<LiveProject[]> => {
  const projects = getProjects();
  const [intelligenceList, discoveryResult] = await Promise.all([getAllProjectIntelligence(), runDiscoveryPipelineAgainstRegistry()]);

  const discoveryMatchByProjectId = new Map<string, DiscoveryProject>();
  const standaloneDiscoveryProjects: DiscoveryProject[] = [];

  for (const discoveryProject of discoveryResult.projects) {
    const { registryMatch } = discoveryProject.evidence;
    if (FOLDED_MATCH_TYPES.has(registryMatch.type) && registryMatch.project) {
      discoveryMatchByProjectId.set(registryMatch.project.id, discoveryProject);
    } else {
      standaloneDiscoveryProjects.push(discoveryProject);
    }
  }

  // `intelligenceList[i]` corresponds to `projects[i]` — `getAllProjectIntelligence()`
  // builds its batch via `projects.map(...)`, so zipping by index avoids an
  // id-based `.find()` per project.
  const registryLiveProjects = projects.map((project, index) =>
    buildLiveProjectFromIntelligence(project, intelligenceList[index], discoveryMatchByProjectId.get(project.id) ?? null)
  );

  const discoveryLiveProjects = standaloneDiscoveryProjects.map(buildLiveProjectFromDiscovery);

  return [...registryLiveProjects, ...discoveryLiveProjects];
});
