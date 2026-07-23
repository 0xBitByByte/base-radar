/**
 * Placeholder — Coinbase/Base does not expose a public, programmatic
 * ecosystem-directory API today, and no wrapper for one exists anywhere in
 * `lib/providers/`. Per this PR's constraint ("do not implement external
 * API integrations unless lightweight wrappers already exist"), this
 * provider satisfies the `DiscoveryProvider` contract but performs no
 * network call — it resolves immediately with zero candidates. Wiring a
 * real integration (likely scraping or a future official API) is future
 * work; this PR only reserves the source's place in the pipeline.
 */

import { recordDiscoverySuccess } from "@/lib/discovery/health";
import type { DiscoveryProvider, DiscoveryResult } from "@/lib/discovery/provider";

const SOURCE = "base-ecosystem" as const;

export const baseEcosystemDiscoveryProvider: DiscoveryProvider = {
  source: SOURCE,

  async discover(): Promise<DiscoveryResult> {
    const fetchedAt = new Date().toISOString();
    recordDiscoverySuccess(SOURCE, 0, fetchedAt);
    return { source: SOURCE, candidates: [], fetchedAt };
  },
};
