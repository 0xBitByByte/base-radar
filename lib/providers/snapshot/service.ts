/** Public API for the Snapshot provider — cache- and rate-limit-guarded, same pattern as every other provider in this layer. */

import { fetchProposals, fetchProposalsForSpaces } from "@/lib/providers/snapshot/client";
import { mapProposal, mapProposals, type SnapshotProposal } from "@/lib/providers/snapshot/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { assertRateLimit, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderName, ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult, withStaleFallback } from "@/lib/providers/common/utilities";

const PROVIDER_TAG = "snapshot" as ProviderName;
// PR-098.07 — was 5min; retuned into the "Governance" freshness class
// (15-30min, `lib/intelligence/freshness.ts`) — proposal activity moves
// slower than that, matching this file's own original reasoning ("far
// more slowly than price/TVL data") more precisely.
const CACHE_TTL_MS = 1_200_000;
const RATE_LIMIT: RateLimitConfig = { limit: 20, windowMs: 60_000 };

/** PR-098.07 — added `withStaleFallback`, previously absent (confirmed: this file had zero uses, unlike every other provider). A transient Snapshot outage now degrades to the last real proposal list instead of blanking governance data out. */
export async function getProposals(space: string): Promise<ProviderResult<SnapshotProposal[]>> {
  const cacheKey = `snapshot:proposals:${space}`;
  const result = await toProviderResult(PROVIDER_TAG, () =>
    getOrSet(cacheKey, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER_TAG, RATE_LIMIT);
      const raw = await fetchProposals(space);
      return mapProposals(raw);
    })
  );
  return withStaleFallback(PROVIDER_TAG, cacheKey, result);
}

/**
 * MASTER HARDENING PASS — Concern 1 (API cost audit). Batched sibling of
 * `getProposals` above: one real GraphQL request for every requested space
 * (`space_in`, verified live against Snapshot's own API — see
 * `client.ts`'s `fetchProposalsForSpaces` doc comment for the exact
 * evidence and the documented crowding assumption behind `first: 200`),
 * instead of one request per project. `getProposals` itself is untouched
 * and still used wherever only a single space is needed.
 *
 * Cached as ONE unit under a key derived from the sorted, deduplicated
 * space list — same TTL and `withStaleFallback` semantics as every other
 * provider call, just at batch granularity. The one honest tradeoff this
 * introduces: where a single-space failure used to degrade only THAT
 * project's Governance dimension, a batched-call failure degrades every
 * requested space's data together (to the same last-known-good batch, via
 * `withStaleFallback` — never blanked, never fabricated, just coarser-
 * grained staleness). Documented here rather than silently accepted.
 *
 * Returns a map keyed by space id; a space with no proposals on record (or
 * one whose most-recent proposal happened to fall outside `first: 200`'s
 * window — the documented crowding edge case) resolves to an empty array,
 * identical in effect to `getProposals`'s own "configured but no
 * proposals" outcome for `normalizeGovernance`'s N/A handling.
 */
export async function getProposalsForSpaces(spaces: string[]): Promise<ProviderResult<Record<string, SnapshotProposal[]>>> {
  const uniqueSpaces = [...new Set(spaces)].sort();
  if (uniqueSpaces.length === 0) return { ok: true, data: {}, source: PROVIDER_TAG, fetchedAt: new Date().toISOString() };

  const cacheKey = `snapshot:proposals-batch:${uniqueSpaces.join(",")}`;
  const result = await toProviderResult(PROVIDER_TAG, () =>
    getOrSet(cacheKey, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER_TAG, RATE_LIMIT);
      const raw = await fetchProposalsForSpaces(uniqueSpaces);
      const grouped: Record<string, SnapshotProposal[]> = Object.fromEntries(uniqueSpaces.map((space) => [space, []]));
      for (const rawProposal of raw) {
        const spaceId = rawProposal.space.id;
        if (!(spaceId in grouped)) continue; // defensive: Snapshot returning a space we didn't ask for
        grouped[spaceId].push(mapProposal(rawProposal));
      }
      return grouped;
    })
  );
  return withStaleFallback(PROVIDER_TAG, cacheKey, result);
}

export type { SnapshotProposal };
