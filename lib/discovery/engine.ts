/**
 * The Discovery Engine — collects candidates from every registered
 * `DiscoveryProvider` in parallel. This is the whole of "automatic Registry
 * growth" this PR builds: it returns candidates as data. Nothing here
 * writes to `data/projects/`, nothing here auto-accepts a candidate, and
 * nothing here is called from any route or page yet — see
 * docs/DISCOVERY_ENGINE.md "Future Ingestion Flow" for what a later PR
 * would need to add to actually act on these results.
 */

import { aiDiscoveryProvider } from "@/lib/discovery/providers/ai-discovery";
import { baseEcosystemDiscoveryProvider } from "@/lib/discovery/providers/base-ecosystem";
import { blockscoutDiscoveryProvider } from "@/lib/discovery/providers/blockscout";
import { coingeckoDiscoveryProvider } from "@/lib/discovery/providers/coingecko";
import { communityDiscoveryProvider } from "@/lib/discovery/providers/community";
import { defillamaDiscoveryProvider } from "@/lib/discovery/providers/defillama";
import { farcasterDiscoveryProvider } from "@/lib/discovery/providers/farcaster";
import { githubDiscoveryProvider } from "@/lib/discovery/providers/github";
import { recordDiscoveryFailure } from "@/lib/discovery/health";
import type { DiscoveryProvider, DiscoveryResult } from "@/lib/discovery/provider";
import type { CandidateProject } from "@/lib/discovery/types";

/** Every discovery source this PR registers, in the order listed in the brief. */
export const DISCOVERY_PROVIDERS: DiscoveryProvider[] = [
  baseEcosystemDiscoveryProvider,
  coingeckoDiscoveryProvider,
  defillamaDiscoveryProvider,
  blockscoutDiscoveryProvider,
  githubDiscoveryProvider,
  farcasterDiscoveryProvider,
  communityDiscoveryProvider,
  aiDiscoveryProvider,
];

export type DiscoveryRunResult = {
  candidates: CandidateProject[];
  providerResults: DiscoveryResult[];
  fetchedAt: string;
};

/**
 * Runs every provider's `discover()` in parallel via `Promise.allSettled`
 * — one source throwing (a placeholder aside, a future real integration
 * could) never withholds another source's real candidates. A rejected
 * provider contributes an empty `DiscoveryResult` for its source and is
 * recorded as a discovery-health failure; it is never silently dropped
 * from `providerResults`.
 */
export async function runDiscovery(providers: DiscoveryProvider[] = DISCOVERY_PROVIDERS): Promise<DiscoveryRunResult> {
  const fetchedAt = new Date().toISOString();

  const settled = await Promise.allSettled(providers.map((provider) => provider.discover()));

  const providerResults: DiscoveryResult[] = settled.map((outcome, index) => {
    const provider = providers[index];
    if (outcome.status === "fulfilled") return outcome.value;

    const message = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
    recordDiscoveryFailure(provider.source, message);
    return { source: provider.source, candidates: [], fetchedAt };
  });

  return {
    candidates: providerResults.flatMap((result) => result.candidates),
    providerResults,
    fetchedAt,
  };
}
