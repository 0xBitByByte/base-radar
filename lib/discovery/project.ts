/**
 * PR-053 — Discovery Result (Task 7's reusable models + the final pipeline
 * stage from Task 1's architecture diagram):
 *
 *   Discovery Sources → Normalization → Deduplication → Registry Matching
 *   → Provider Enrichment → Classification → Confidence Scoring →
 *   Discovery Result
 *
 * `DiscoveryProject` is the one model this whole module exists to
 * produce — everything the future Projects page (Task 8) needs to power
 * Verified/New/Recently Added/Trending/Recently Updated/Upcoming/
 * Categories/Search/Filters without this engine needing to change shape
 * again. Nothing here writes to `data/projects/` or any store — pure
 * data in, pure data out, exactly like every other module in this
 * directory.
 */

import { getProjects } from "@/data/projects/helpers";
import type { Project } from "@/data/projects/types";
import type { ProjectCategory, ProjectTag, DiscoverySource } from "@/data/projects/enums";
import { classifyCandidate, type ClassificationResult } from "@/lib/discovery/classify";
import { computeDiscoveryConfidence, type DiscoveryConfidence } from "@/lib/discovery/confidence";
import { dedupeCandidates, type DeduplicatedCandidate } from "@/lib/discovery/dedupe";
import { DISCOVERY_PROVIDERS, runDiscovery, type DiscoveryRunResult } from "@/lib/discovery/engine";
import { enrichCandidate, type EnrichmentEvidence } from "@/lib/discovery/enrich";
import { matchAgainstRegistry, type RegistryMatch } from "@/lib/discovery/registryMatch";
import { computeDiscoveryStatus, type DiscoveryStatus } from "@/lib/discovery/status";
import type { CandidateContract, CandidateSocials } from "@/lib/discovery/types";
import type { DiscoveryProvider } from "@/lib/discovery/provider";
import type { GithubRepoRef } from "@/data/projects/types";

/** Everything that went into a `DiscoveryProject`'s derived fields — kept together so a future review UI can show its full "why" in one place, matching `RegistryMatch.reason`/`DiscoveryStatusResult.reason`'s own transparency convention. */
export type DiscoveryEvidence = {
  registryMatch: RegistryMatch;
  classification: ClassificationResult;
  confidence: DiscoveryConfidence;
  enrichment: EnrichmentEvidence;
  statusReason: string;
};

/**
 * The final, reusable per-project discovery model — one per deduplicated
 * real-world project, not one per raw provider candidate. This is what a
 * future Projects page / review UI consumes; nothing downstream should
 * need to reach back into `CandidateProject`/`DeduplicatedCandidate`.
 */
export type DiscoveryProject = {
  /** `${primary source}:${primary externalId}` — stable across repeat runs, same convention as `queue.ts`'s `candidateQueueId`. */
  id: string;
  displayName: string;
  normalizedName: string;
  website?: string;
  github?: GithubRepoRef;
  socials: CandidateSocials;
  contracts: CandidateContract[];
  coingeckoId?: string;
  defillamaSlug?: string;
  /** PR-072 — real logo/image URL, when any contributing candidate (primary or a merged duplicate) has one — see `pickCandidateLogoUrl` below. `undefined` when none do; never fabricated. */
  logoUrl?: string;
  category: ProjectCategory;
  tags: ProjectTag[];
  status: DiscoveryStatus;
  confidence: DiscoveryConfidence;
  /** Every `DiscoverySource` that surfaced this project in this run — real "multiple provider agreement" evidence, and directly usable by a future Trending/Categories filter to show provenance. */
  sources: DiscoverySource[];
  evidence: DiscoveryEvidence;
  discoveredAt: string;
};

/**
 * PR-072 — prefers the primary candidate's own logo, but a dedup group's
 * `primary` is chosen by source-confidence (`dedupe.ts`'s `pickPrimary`),
 * not by which source happens to carry image data — so a DefiLlama-primary
 * group with a merged CoinGecko duplicate (or vice versa) can still have a
 * real logo available even when the primary itself doesn't. Same
 * "loop primary+duplicates, take the first real value" pattern
 * `enrich.ts`'s `extractMarketEvidence` already uses for volume/TVL.
 */
function pickCandidateLogoUrl(deduped: DeduplicatedCandidate): string | undefined {
  const candidates = [deduped.primary, ...deduped.duplicates];
  return candidates.find((candidate) => candidate.logoUrl)?.logoUrl;
}

/**
 * Builds the final `DiscoveryProject` for one deduplicated candidate group
 * — runs Registry Matching, Provider Enrichment, Classification, and
 * Confidence Scoring in that order (enrichment needs the registry match
 * first, to know whether a matched project's own GitHub repo is worth
 * checking for commit activity; confidence needs both matching and
 * enrichment's output).
 */
export async function buildDiscoveryProject(deduped: DeduplicatedCandidate, existingProjects: Project[]): Promise<DiscoveryProject> {
  const candidate = deduped.primary;

  const registryMatch = matchAgainstRegistry(candidate, existingProjects);
  const enrichment = await enrichCandidate(deduped, registryMatch);
  const classification = classifyCandidate(candidate);
  const confidence = computeDiscoveryConfidence(deduped, registryMatch, enrichment);
  const statusResult = computeDiscoveryStatus(candidate, registryMatch, enrichment);

  return {
    id: deduped.id,
    displayName: candidate.displayName,
    normalizedName: candidate.normalizedName,
    website: candidate.website,
    github: candidate.github,
    socials: candidate.socials,
    contracts: candidate.contracts,
    coingeckoId: candidate.coingeckoId,
    defillamaSlug: candidate.defillamaSlug,
    logoUrl: pickCandidateLogoUrl(deduped),
    category: classification.category,
    tags: classification.tags,
    status: statusResult.status,
    confidence,
    sources: deduped.sources,
    evidence: { registryMatch, classification, confidence, enrichment, statusReason: statusResult.reason },
    discoveredAt: candidate.discoveredAt,
  };
}

export type DiscoveryPipelineResult = {
  projects: DiscoveryProject[];
  raw: DiscoveryRunResult;
};

/**
 * The full pipeline entry point — runs every `DiscoveryProvider`, dedupes,
 * then builds a `DiscoveryProject` per deduplicated group against the
 * `existingProjects` list passed in. Pure with respect to `data/projects/`
 * — it only ever reads that list for comparison, exactly like PR-039's
 * `findDuplicateMatches` already did; nothing here writes anywhere.
 */
export async function runDiscoveryPipeline(
  existingProjects: Project[],
  providers: DiscoveryProvider[] = DISCOVERY_PROVIDERS
): Promise<DiscoveryPipelineResult> {
  const raw = await runDiscovery(providers);
  const deduped = dedupeCandidates(raw.candidates);
  const projects = await Promise.all(deduped.map((group) => buildDiscoveryProject(group, existingProjects)));
  return { projects, raw };
}

/** Convenience wrapper for real usage — defaults `existingProjects` to the live Project Registry. Nothing calls this yet (no route, page, or cron job), matching PR-039's own "nothing wired in" scope for this whole directory. */
export async function runDiscoveryPipelineAgainstRegistry(): Promise<DiscoveryPipelineResult> {
  return runDiscoveryPipeline(getProjects());
}
