/**
 * The Project Intelligence Engine's public entry point — the single place
 * anything outside `lib/intelligence/` should import from. Everything else
 * in this directory is an implementation detail of how these three
 * functions are built.
 *
 * Wired into the Explorer (Grid/Table/Quick View) via `app/dashboard/projects/page.tsx`.
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
import type { ProjectSources, ProjectIntelligence } from "@/lib/intelligence/types";
import { getIntelligenceProvider } from "@/lib/intelligence-engine";
import { getGovernanceProvider, type GovernanceEvent } from "@/lib/governance";
import * as coingecko from "@/lib/providers/coingecko/service";
import * as github from "@/lib/providers/github/service";
import * as defillama from "@/lib/providers/defillama/service";
import type { CommitActivity } from "@/lib/providers/github/service";
import type { SparklinePoint } from "@/lib/data/types";

type ExtendedProjectData = {
  genesisDate: string | null;
  commitActivity: CommitActivity | null;
  tvlHistory: SparklinePoint[] | null;
};

const EMPTY_EXTENDED: ExtendedProjectData = { genesisDate: null, commitActivity: null, tvlHistory: null };

/**
 * Single-project-only enrichment — heavier, per-coin/per-repo/per-protocol
 * calls that are fine on the Project Profile page but would be wasteful (and
 * rate-limit-risky) to run for every project on every Explorer load. Only
 * `getProjectIntelligence` opts into this; `getAllProjectIntelligence`
 * (Explorer's batch path) never does.
 */
async function gatherExtendedProjectData(project: Project, sources: ProjectSources): Promise<ExtendedProjectData> {
  const [genesisRes, commitRes, tvlHistoryRes] = await Promise.allSettled([
    sources.market.status === "live" && project.providerIds.coingeckoId
      ? coingecko.getCoinDetail(project.providerIds.coingeckoId)
      : Promise.resolve(null),
    sources.github.status === "live" && sources.github.data?.fullName
      ? github.getCommitActivity(sources.github.data.fullName)
      : Promise.resolve(null),
    sources.tvl.status === "live" && project.providerIds.defillamaSlug
      ? defillama.getProtocolTvlHistory(project.providerIds.defillamaSlug)
      : Promise.resolve(null),
  ]);

  const genesisDate =
    genesisRes.status === "fulfilled" && genesisRes.value && genesisRes.value.ok ? genesisRes.value.data : null;
  const commitActivity =
    commitRes.status === "fulfilled" && commitRes.value && commitRes.value.ok ? commitRes.value.data : null;
  const tvlHistory =
    tvlHistoryRes.status === "fulfilled" && tvlHistoryRes.value && tvlHistoryRes.value.ok
      ? tvlHistoryRes.value.data
      : null;

  return { genesisDate, commitActivity, tvlHistory };
}

const ENGINE_VERSION = "0.1.0";

/** `null` when this project has no `governance.snapshotSpace` configured — never fabricated, per `lib/governance`'s registry-gated rule. */
async function fetchProjectGovernanceEvents(project: Project): Promise<GovernanceEvent[] | null> {
  const snapshotSpace = project.governance?.snapshotSpace;
  if (!snapshotSpace) return null;

  return getGovernanceProvider().fetchEvents({
    projects: [{ projectId: project.id, projectName: project.name, snapshotSpace }],
  });
}

/**
 * Builds the full intelligence record for one already-resolved project.
 * Pass a `bulk` fetched via `fetchProviderBulkData()` when building
 * intelligence for many projects together (see `getAllProjectIntelligence`
 * below) to avoid redundant shared-provider lookups.
 */
export async function buildProjectIntelligence(
  project: Project,
  bulk?: ProviderBulkData,
  options?: { extended?: boolean }
): Promise<ProjectIntelligence> {
  const sources = await gatherProjectSources(project, bulk);
  const generatedAt = new Date().toISOString();
  const extended = options?.extended ? await gatherExtendedProjectData(project, sources) : EMPTY_EXTENDED;

  const identity = mergeIdentity(project);
  const market = mergeMarket(sources, extended.genesisDate);
  const trading = mergeTrading(sources);
  const tvl = mergeTvl(sources, extended.tvlHistory);
  const contracts = mergeContracts(project, sources);
  const githubIntel = mergeGithub(sources, extended.commitActivity);
  const chain = mergeChain(project, sources);
  const community = mergeCommunity(project);

  const health = computeHealth(project, { market, trading, tvl, github: githubIntel });
  const confidence = computeConfidence(project, sources);
  const freshness = computeFreshness(sources, generatedAt);
  const sourcesSummary = buildSourcesSummary(sources);

  const intelligenceProvider = getIntelligenceProvider();

  // allSettled, not all — a misconfigured GOVERNANCE_PROVIDER (or a future
  // INTELLIGENCE_PROVIDER stub) throws synchronously, and `getAllProjectIntelligence`
  // builds every registry project's record with the same helper. One
  // provider failing should degrade that single project's fields, not fail
  // every project in the batch.
  const [summaryRes, narrativeRes, governanceRes] = await Promise.allSettled([
    intelligenceProvider.generateProjectSummary({
      name: identity.name,
      healthScore: health.score,
      healthLabel: health.label,
      confidenceScore: confidence.score,
      confidenceLevel: confidence.level,
      verificationStatus: community.verificationStatus,
      changePct24h: market.changePct24h,
      tvlUsd: tvl.tvlUsd,
      tvlChangePct24h: tvl.changePct24h,
      githubStars: githubIntel.stars,
    }),
    market.available && market.changePct24h !== null
      ? intelligenceProvider.generateNarrative({
          samples: [
            {
              category: identity.categories[0] ?? "General",
              changePct24h: market.changePct24h,
              volumeUsd: trading.volume24hUsd ?? 0,
            },
          ],
        })
      : Promise.resolve({ signals: [] }),
    fetchProjectGovernanceEvents(project),
  ]);

  const summary = summaryRes.status === "fulfilled" ? summaryRes.value.summary : "";
  const narrative = narrativeRes.status === "fulfilled" ? (narrativeRes.value.signals[0] ?? null) : null;
  const governance = governanceRes.status === "fulfilled" ? governanceRes.value : null;

  // Per-project whale detection isn't computed here — it would multiply
  // Blockscout transfer-history calls across every registry project on
  // every Explorer load. Whale activity stays a dashboard/ecosystem-wide
  // signal (`lib/whale`); this risk factor is simply never triggered here
  // rather than fabricating a "no activity" claim.
  const verifiedContractPct =
    contracts.count > 0 ? (contracts.items.filter((c) => c.verified === true).length / contracts.count) * 100 : null;

  let risk: ProjectIntelligence["risk"];
  try {
    risk = await intelligenceProvider.generateRiskAnalysis({
      healthScore: health.score,
      confidenceScore: confidence.score,
      verificationStatus: community.verificationStatus,
      freshness: freshness.overall,
      hasRecentWhaleActivity: false,
      verifiedContractPct,
      liquidityUsd: trading.liquidityUsd,
      tvlChangePct7d: tvl.changePct7d,
      githubCommitsLast7d: githubIntel.commitsLast7d,
      governanceActiveCount: governance ? governance.filter((event) => event.status === "active").length : null,
    });
  } catch {
    risk = { level: "moderate", explanation: "Risk analysis unavailable.", contributors: [] };
  }

  return {
    identity,
    market,
    trading,
    tvl,
    contracts,
    github: githubIntel,
    chain,
    community,
    health,
    sources: sourcesSummary,
    confidence,
    freshness,
    metadata: { engineVersion: ENGINE_VERSION, generatedAt },
    summary,
    narrative,
    risk,
    governance,
  };
}

/** Looks up a project by `id` or `slug` and builds its intelligence record. Returns `null` if the project doesn't exist. */
export async function getProjectIntelligence(idOrSlug: string): Promise<ProjectIntelligence | null> {
  const project = getProject(idOrSlug);
  if (!project) return null;
  return buildProjectIntelligence(project, undefined, { extended: true });
}

/** Builds intelligence records for every project in the registry, sharing one round of bulk provider fetches across all of them. */
export async function getAllProjectIntelligence(): Promise<ProjectIntelligence[]> {
  const projects = getProjects();
  const bulk = await fetchProviderBulkData();
  return Promise.all(projects.map((project) => buildProjectIntelligence(project, bulk)));
}
