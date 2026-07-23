/**
 * Placeholder — the brief's own "future placeholder" source. An eventual
 * `ai-discovery` provider would cross-reference the other seven sources'
 * output for candidates none of them caught individually (see
 * docs/PROJECT_REGISTRY.md's Discovery Sources table), which by
 * definition depends on those sources already running — not something
 * this infrastructure PR builds. Resolves immediately with zero
 * candidates.
 */

import { recordDiscoverySuccess } from "@/lib/discovery/health";
import type { DiscoveryProvider, DiscoveryResult } from "@/lib/discovery/provider";

const SOURCE = "ai-discovery" as const;

export const aiDiscoveryProvider: DiscoveryProvider = {
  source: SOURCE,

  async discover(): Promise<DiscoveryResult> {
    const fetchedAt = new Date().toISOString();
    recordDiscoverySuccess(SOURCE, 0, fetchedAt);
    return { source: SOURCE, candidates: [], fetchedAt };
  },
};
