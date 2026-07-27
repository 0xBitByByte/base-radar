/**
 * PR-053 — Cross-candidate deduplication, the pipeline stage between raw
 * discovery and registry matching (see docs/DISCOVERY_ENGINE.md's
 * architecture diagram: "Discovery Sources → Normalization →
 * Deduplication → Registry Matching → ..."). PR-039's `runDiscovery()`
 * only concatenated every source's candidates — the same real project
 * (e.g. Aerodrome Finance) surfaced by both `coingecko` and `defillama` in
 * one run produced two separate `CandidateProject`s with no link between
 * them. This module merges those into one `DeduplicatedCandidate`,
 * carrying the union of contributing sources — which is also the real,
 * concrete evidence behind Task 6's "multiple provider agreement"
 * confidence signal (`lib/discovery/confidence.ts`).
 *
 * Pure — never merges or mutates a `CandidateProject` in place, never
 * discards a raw candidate (every one is still reachable via `duplicates`
 * on whichever group it joined).
 */

import { normalizeHandle, normalizeWebsite } from "@/lib/discovery/normalize";
import type { CandidateProject } from "@/lib/discovery/types";

export type DeduplicatedCandidate = {
  /** Stable id for this group — `${source}:${externalId}` of the representative candidate (see `pickPrimary`). */
  id: string;
  /** The single candidate chosen to represent this group — see `pickPrimary` for the selection rule. */
  primary: CandidateProject;
  /** Every other raw candidate merged into this group (excludes `primary`). Empty when only one source found this project. */
  duplicates: CandidateProject[];
  /** Every `DiscoverySource` that surfaced this project, `primary`'s included — deduplicated, in discovery order. */
  sources: CandidateProject["source"][];
};

/**
 * Two raw candidates are considered the same real-world project when they
 * agree on at least one identifier stronger than a bare name match — a
 * shared `coingeckoId`, a shared `defillamaSlug`, a shared contract
 * address, or a shared normalized website/Twitter handle. A name-only
 * match is deliberately NOT sufficient here (two unrelated projects can
 * share a generic word) — this mirrors `duplicates.ts`'s own "never rely
 * only on name" principle, applied one stage earlier.
 */
function sameProject(a: CandidateProject, b: CandidateProject): boolean {
  if (a.coingeckoId && b.coingeckoId && a.coingeckoId === b.coingeckoId) return true;
  if (a.defillamaSlug && b.defillamaSlug && a.defillamaSlug === b.defillamaSlug) return true;

  if (a.contracts.length > 0 && b.contracts.length > 0) {
    const hasSharedContract = a.contracts.some((ac) =>
      b.contracts.some((bc) => ac.chain === bc.chain && ac.address.toLowerCase() === bc.address.toLowerCase())
    );
    if (hasSharedContract) return true;
  }

  const aWebsite = normalizeWebsite(a.website);
  const bWebsite = normalizeWebsite(b.website);
  if (aWebsite && bWebsite && aWebsite === bWebsite) return true;

  const aTwitter = normalizeHandle(a.socials.twitter);
  const bTwitter = normalizeHandle(b.socials.twitter);
  if (aTwitter && bTwitter && aTwitter === bTwitter) return true;

  // A name match is only trusted as a corroborating signal alongside
  // one of the stronger checks above having already failed to rule
  // things out — i.e. never on its own. This keeps `sameProject` honest
  // about which signal actually won, rather than silently allowing name
  // equality to merge two unrelated same-named tokens.
  return false;
}

/**
 * Picks the representative candidate for a merged group — whichever
 * contributing candidate has the highest `SOURCE_CONFIDENCE`-derived
 * `confidence` (ties broken by discovery order), so the group's canonical
 * name/website/socials come from its most-trusted source rather than an
 * arbitrary one.
 */
function pickPrimary(group: CandidateProject[]): CandidateProject {
  return group.reduce((best, candidate) => (candidate.confidence > best.confidence ? candidate : best), group[0]);
}

/**
 * Groups raw candidates from a single discovery run into deduplicated
 * projects. O(n²) comparisons — acceptable at this codebase's real scale
 * (a handful of hundred Base-ecosystem listings per run, not millions);
 * see docs/PR-053_LIVE_DISCOVERY_ENGINE.md "Remaining Limitations" for
 * when this would need a real index instead.
 */
export function dedupeCandidates(candidates: CandidateProject[]): DeduplicatedCandidate[] {
  const groups: CandidateProject[][] = [];

  for (const candidate of candidates) {
    const existingGroup = groups.find((group) => group.some((member) => sameProject(member, candidate)));
    if (existingGroup) {
      existingGroup.push(candidate);
    } else {
      groups.push([candidate]);
    }
  }

  return groups.map((group) => {
    const primary = pickPrimary(group);
    const duplicates = group.filter((c) => c !== primary);
    const sources = Array.from(new Set(group.map((c) => c.source)));
    return {
      id: `${primary.source}:${primary.externalId}`,
      primary,
      duplicates,
      sources,
    };
  });
}
