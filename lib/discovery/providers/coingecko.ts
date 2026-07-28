/**
 * Backed by a real, already-existing lightweight wrapper —
 * `getBaseEcosystemMarkets()` (`lib/providers/coingecko/service.ts`) already
 * lists coins CoinGecko categorizes under the Base ecosystem. This provider
 * adds no new API surface; it only normalizes that existing call's output
 * into `CandidateProject`s.
 *
 * The market-listing endpoint carries no website/social/contract fields
 * (confirmed against `CoinMarket`'s shape) — a real per-coin detail call
 * could add those later, but `getCoinDetail()` today only resolves a
 * genesis date, not a full profile, so this candidate's `website`/`socials`/
 * `contracts` stay unset rather than guessed.
 */

import { BASE_ECOSYSTEM_MARKETS_PAGE_SIZE, getBaseEcosystemMarkets } from "@/lib/providers/coingecko/service";
import { recordDiscoveryFailure, recordDiscoverySuccess } from "@/lib/discovery/health";
import { normalizeName, SOURCE_CONFIDENCE } from "@/lib/discovery/normalize";
import type { DiscoveryProvider, DiscoveryResult } from "@/lib/discovery/provider";
import type { CandidateProject } from "@/lib/discovery/types";

const SOURCE = "coingecko" as const;

export const coingeckoDiscoveryProvider: DiscoveryProvider = {
  source: SOURCE,

  async discover(): Promise<DiscoveryResult> {
    const fetchedAt = new Date().toISOString();
    // PR-054 — same page size `lib/intelligence/sources.ts`'s bulk fetch
    // uses, so this call and that one share one cache entry (and, within
    // the same request, one in-flight network call) instead of two.
    const result = await getBaseEcosystemMarkets(BASE_ECOSYSTEM_MARKETS_PAGE_SIZE);

    if (!result.ok) {
      recordDiscoveryFailure(SOURCE, result.error.message);
      return { source: SOURCE, candidates: [], fetchedAt };
    }

    const candidates: CandidateProject[] = result.data.map((market) => ({
      source: SOURCE,
      externalId: market.id,
      normalizedName: normalizeName(market.name),
      displayName: market.name,
      // PR-053 — the real CoinGecko API id, already fetched as `externalId`;
      // surfaced as its own structured field for registry matching.
      coingeckoId: market.id,
      socials: {},
      contracts: [],
      discoveredAt: fetchedAt,
      confidence: SOURCE_CONFIDENCE[SOURCE],
      providerMetadata: { ...market },
    }));

    recordDiscoverySuccess(SOURCE, candidates.length, fetchedAt);
    return { source: SOURCE, candidates, fetchedAt };
  },
};
