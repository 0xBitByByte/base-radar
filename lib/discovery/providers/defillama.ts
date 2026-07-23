/**
 * Backed by a real, already-existing lightweight wrapper —
 * `getBaseProtocols()` (`lib/providers/defillama/service.ts`) already lists
 * every DefiLlama-tracked protocol with TVL on Base. This provider adds no
 * new API surface; it only normalizes that existing call's output.
 *
 * DefiLlama's public `/protocols` response does carry a stable slug and
 * website/social fields in reality, but this codebase's typed `Protocol`
 * (`lib/providers/defillama/mapper.ts`) only maps `name`/`symbol`/`chains`/
 * TVL/market-cap/category — reading undeclared fields off the raw response
 * would be a new (if small) integration, not a use of an existing wrapper,
 * so `externalId` falls back to the protocol's own name and `website`/
 * `socials`/`contracts` stay unset rather than guessed.
 */

import { getBaseProtocols } from "@/lib/providers/defillama/service";
import { recordDiscoveryFailure, recordDiscoverySuccess } from "@/lib/discovery/health";
import { normalizeName, SOURCE_CONFIDENCE } from "@/lib/discovery/normalize";
import type { DiscoveryProvider, DiscoveryResult } from "@/lib/discovery/provider";
import type { CandidateProject } from "@/lib/discovery/types";

const SOURCE = "defillama" as const;

export const defillamaDiscoveryProvider: DiscoveryProvider = {
  source: SOURCE,

  async discover(): Promise<DiscoveryResult> {
    const fetchedAt = new Date().toISOString();
    const result = await getBaseProtocols();

    if (!result.ok) {
      recordDiscoveryFailure(SOURCE, result.error.message);
      return { source: SOURCE, candidates: [], fetchedAt };
    }

    const candidates: CandidateProject[] = result.data.map((protocol) => ({
      source: SOURCE,
      externalId: protocol.name,
      normalizedName: normalizeName(protocol.name),
      displayName: protocol.name,
      socials: {},
      contracts: [],
      discoveredAt: fetchedAt,
      confidence: SOURCE_CONFIDENCE[SOURCE],
      providerMetadata: { ...protocol },
    }));

    recordDiscoverySuccess(SOURCE, candidates.length, fetchedAt);
    return { source: SOURCE, candidates, fetchedAt };
  },
};
