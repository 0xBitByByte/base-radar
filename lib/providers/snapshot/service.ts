/** Public API for the Snapshot provider — cache- and rate-limit-guarded, same pattern as every other provider in this layer. */

import { fetchProposals } from "@/lib/providers/snapshot/client";
import { mapProposals, type SnapshotProposal } from "@/lib/providers/snapshot/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { assertRateLimit, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderName, ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult } from "@/lib/providers/common/utilities";

const PROVIDER_TAG = "snapshot" as ProviderName;
const CACHE_TTL_MS = 300_000; // 5 min — governance proposals change far more slowly than price/TVL data.
const RATE_LIMIT: RateLimitConfig = { limit: 20, windowMs: 60_000 };

export async function getProposals(space: string): Promise<ProviderResult<SnapshotProposal[]>> {
  return toProviderResult(PROVIDER_TAG, () =>
    getOrSet(`snapshot:proposals:${space}`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER_TAG, RATE_LIMIT);
      const raw = await fetchProposals(space);
      return mapProposals(raw);
    })
  );
}

export type { SnapshotProposal };
