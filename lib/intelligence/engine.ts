/**
 * The Project Intelligence Engine's public entry point — the single place
 * anything outside `lib/intelligence/` should import from. Everything else
 * in this directory is an implementation detail of how these three
 * functions are built.
 *
 * Not wired into any route, page, or component yet — see the PR notes for
 * why that's deliberately out of scope for this change.
 */

import { getProject, getProjects } from "@/data/projects/helpers";
import type { Project } from "@/data/projects/types";
import {
  buildSourcesSummary,
  fetchProviderBulkData,
  gatherProjectSources,
  type ProviderBulkData,
} from "@/lib/intelligence/sources";
import {
  mergeChain,
  mergeCommunity,
  mergeContracts,
  mergeGithub,
  mergeIdentity,
  mergeMarket,
  mergeTrading,
  mergeTvl,
} from "@/lib/intelligence/merge";
import { computeConfidence } from "@/lib/intelligence/confidence";
import { computeFreshness } from "@/lib/intelligence/freshness";
import { computeHealth } from "@/lib/intelligence/scoring";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

const ENGINE_VERSION = "0.1.0";

/**
 * Builds the full intelligence record for one already-resolved project.
 * Pass a `bulk` fetched via `fetchProviderBulkData()` when building
 * intelligence for many projects together (see `getAllProjectIntelligence`
 * below) to avoid redundant shared-provider lookups.
 */
export async function buildProjectIntelligence(
  project: Project,
  bulk?: ProviderBulkData
): Promise<ProjectIntelligence> {
  const sources = await gatherProjectSources(project, bulk);
  const generatedAt = new Date().toISOString();

  const identity = mergeIdentity(project);
  const market = mergeMarket(sources);
  const trading = mergeTrading(sources);
  const tvl = mergeTvl(sources);
  const contracts = mergeContracts(project, sources);
  const github = mergeGithub(sources);
  const chain = mergeChain(project, sources);
  const community = mergeCommunity(project);

  const health = computeHealth(project, { market, trading, tvl, github });
  const confidence = computeConfidence(project, sources);
  const freshness = computeFreshness(sources, generatedAt);
  const sourcesSummary = buildSourcesSummary(sources);

  return {
    identity,
    market,
    trading,
    tvl,
    contracts,
    github,
    chain,
    community,
    health,
    sources: sourcesSummary,
    confidence,
    freshness,
    metadata: { engineVersion: ENGINE_VERSION, generatedAt },
  };
}

/** Looks up a project by `id` or `slug` and builds its intelligence record. Returns `null` if the project doesn't exist. */
export async function getProjectIntelligence(idOrSlug: string): Promise<ProjectIntelligence | null> {
  const project = getProject(idOrSlug);
  if (!project) return null;
  return buildProjectIntelligence(project);
}

/** Builds intelligence records for every project in the registry, sharing one round of bulk provider fetches across all of them. */
export async function getAllProjectIntelligence(): Promise<ProjectIntelligence[]> {
  const projects = getProjects();
  const bulk = await fetchProviderBulkData();
  return Promise.all(projects.map((project) => buildProjectIntelligence(project, bulk)));
}
