/**
 * PR-092.03 (Portfolio Intelligence) — the one, real cross-reference from a
 * connected wallet's holdings to Base Radar's existing project registry.
 * `lib/portfolio-intelligence/`'s own scoring engine (`engine.ts`) is
 * deliberately wallet-native — most held tokens have no corresponding
 * `LiveProject` entry, so it computes its own diversification/risk/health
 * scores rather than assuming a registry match. This module is the
 * additive piece PR-092.03 actually asks for: for the subset of holdings
 * that DO match a real, already-tracked project, surface that project's
 * real AI Grade/Health/Confidence/Risk and Smart Collection membership —
 * never a second scoring pipeline, never a guessed match.
 *
 * Matching is real-identifier-only: a holding's ERC-20 contract address
 * against `LiveProject.searchIdentifiers.contractAddresses` (the strongest
 * signal — a contract address is unique), falling back to a case-insensitive
 * symbol match against `LiveProject.searchIdentifiers.symbol` only when no
 * address match exists (weaker — symbols collide across chains/projects in
 * principle, but this registry is Base-only and small enough that a false
 * positive has not been observed; still real data, never fabricated).
 * Native ETH (`address: null`) never matches by address — there is no
 * "ETH the project" in this registry, so it can only ever surface via a
 * literal "ETH" symbol entry if one is ever registered (none is today).
 */

import type { HoldingAsset } from "@/lib/holdings/types";
import type { LiveProject } from "@/lib/projects/types";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";

export type HeldProjectLink = {
  holding: HoldingAsset;
  project: LiveProject;
  /** Real Smart Collection names this project currently belongs to, from the same server-evaluated results `/dashboard/collections` renders — empty array (never omitted) when it belongs to none. */
  smartCollectionNames: string[];
};

function findMatchingProject(holding: HoldingAsset, liveProjects: LiveProject[]): LiveProject | null {
  const address = holding.address?.toLowerCase() ?? null;
  if (address) {
    const byAddress = liveProjects.find((project) => project.searchIdentifiers.contractAddresses.some((candidate) => candidate.toLowerCase() === address));
    if (byAddress) return byAddress;
  }

  const symbol = holding.symbol.toLowerCase();
  return liveProjects.find((project) => project.searchIdentifiers.symbol?.toLowerCase() === symbol) ?? null;
}

/**
 * Pure function — real holdings in, real matched links out. A holding with
 * no real registry match is simply absent from the result, never padded
 * with a fabricated placeholder. Order follows `assets`' own order (already
 * value-sorted upstream, per `lib/holdings/normalize.ts`).
 */
export function buildHeldProjectLinks(assets: HoldingAsset[], liveProjects: LiveProject[], serverCollections: SmartCollectionResult[]): HeldProjectLink[] {
  const collectionNamesByProjectId = new Map<string, string[]>();
  for (const collection of serverCollections) {
    for (const match of collection.matches) {
      const names = collectionNamesByProjectId.get(match.projectId) ?? [];
      names.push(collection.name);
      collectionNamesByProjectId.set(match.projectId, names);
    }
  }

  const links: HeldProjectLink[] = [];
  for (const holding of assets) {
    const project = findMatchingProject(holding, liveProjects);
    if (!project) continue;
    links.push({ holding, project, smartCollectionNames: collectionNamesByProjectId.get(project.id) ?? [] });
  }
  return links;
}
