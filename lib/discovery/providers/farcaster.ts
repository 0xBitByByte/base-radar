/**
 * Placeholder — no Farcaster integration exists anywhere in this codebase
 * (no client, no service, no API key configuration). Surfacing candidates
 * from Farcaster casts/channels would require a genuinely new integration
 * (e.g. a Neynar or Hub API client), out of scope for this infrastructure
 * PR. Resolves immediately with zero candidates.
 */

import { recordDiscoverySuccess } from "@/lib/discovery/health";
import type { DiscoveryProvider, DiscoveryResult } from "@/lib/discovery/provider";

const SOURCE = "farcaster" as const;

export const farcasterDiscoveryProvider: DiscoveryProvider = {
  source: SOURCE,

  async discover(): Promise<DiscoveryResult> {
    const fetchedAt = new Date().toISOString();
    recordDiscoverySuccess(SOURCE, 0, fetchedAt);
    return { source: SOURCE, candidates: [], fetchedAt };
  },
};
