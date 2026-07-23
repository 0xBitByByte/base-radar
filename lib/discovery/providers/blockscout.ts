/**
 * Backed by a real, already-existing lightweight wrapper —
 * `getRecentlyVerifiedContract()` (`lib/providers/blockscout/service.ts`)
 * already surfaces the most recently verified contract on Base's Blockscout
 * instance. Unlike CoinGecko/DefiLlama's list endpoints, this one returns
 * at most a single item per call — so one `discover()` call yields zero or
 * one candidate, never a batch. A future pass could page through more of
 * Blockscout's verified-contracts feed, but no such wrapper exists today.
 *
 * A verified contract with no existing registry match is a genuinely weak
 * signal on its own (no name confirmation, no identity) — reflected in its
 * low `SOURCE_CONFIDENCE` default.
 */

import { getRecentlyVerifiedContract } from "@/lib/providers/blockscout/service";
import { recordDiscoveryFailure, recordDiscoverySuccess } from "@/lib/discovery/health";
import { normalizeName, SOURCE_CONFIDENCE } from "@/lib/discovery/normalize";
import type { DiscoveryProvider, DiscoveryResult } from "@/lib/discovery/provider";
import type { CandidateProject } from "@/lib/discovery/types";

const SOURCE = "blockscout" as const;

export const blockscoutDiscoveryProvider: DiscoveryProvider = {
  source: SOURCE,

  async discover(): Promise<DiscoveryResult> {
    const fetchedAt = new Date().toISOString();
    const result = await getRecentlyVerifiedContract();

    if (!result.ok) {
      recordDiscoveryFailure(SOURCE, result.error.message);
      return { source: SOURCE, candidates: [], fetchedAt };
    }

    if (!result.data) {
      recordDiscoverySuccess(SOURCE, 0, fetchedAt);
      return { source: SOURCE, candidates: [], fetchedAt };
    }

    const contract = result.data;
    const displayName = contract.name ?? contract.address;

    const candidate: CandidateProject = {
      source: SOURCE,
      externalId: contract.address,
      normalizedName: normalizeName(displayName),
      displayName,
      socials: {},
      contracts: [{ chain: "base", address: contract.address }],
      discoveredAt: fetchedAt,
      confidence: SOURCE_CONFIDENCE[SOURCE],
      providerMetadata: { ...contract },
    };

    recordDiscoverySuccess(SOURCE, 1, fetchedAt);
    return { source: SOURCE, candidates: [candidate], fetchedAt };
  },
};
