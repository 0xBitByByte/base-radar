/**
 * Placeholder — the brief's own "future placeholder" source. There is no
 * "submit a project" form anywhere in this app yet; this provider exists
 * purely so `community` has a slot in the pipeline before that form exists.
 * A future submission form would write directly into the Discovery Queue
 * (`lib/discovery/queue.ts`) rather than through a `discover()` poll —
 * this stub's `discover()` always resolves empty since there is nothing to
 * poll.
 */

import { recordDiscoverySuccess } from "@/lib/discovery/health";
import type { DiscoveryProvider, DiscoveryResult } from "@/lib/discovery/provider";

const SOURCE = "community" as const;

export const communityDiscoveryProvider: DiscoveryProvider = {
  source: SOURCE,

  async discover(): Promise<DiscoveryResult> {
    const fetchedAt = new Date().toISOString();
    recordDiscoverySuccess(SOURCE, 0, fetchedAt);
    return { source: SOURCE, candidates: [], fetchedAt };
  },
};
