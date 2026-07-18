/**
 * The Alert Provider interface every real data source
 * (`lib/alerts/providers/{github,snapshot,coingecko,defillama,blockscout}.ts`)
 * implements. Deliberately the same shape as `WhaleDetectionProvider`
 * (`lib/whale/types.ts`) and `GovernanceProvider` (`lib/governance/types.ts`)
 * — one async method, no constructor arguments, no shared base class —
 * matching this codebase's existing provider-abstraction convention.
 *
 * Every implementation MUST stay pure: no React, no hooks, no JSX, no
 * `localStorage`, no components. A provider's only job is "read whatever
 * real data the existing Provider Layer already exposes, return `Alert[]`."
 * Persistence (read/pinned/dismissed state) and orchestration (which
 * providers run, how failures are handled) belong to
 * `lib/alerts/service.ts`, never to an individual provider.
 */

import type { Alert } from "@/lib/alerts/types";

export interface AlertProvider {
  fetchAlerts(): Promise<Alert[]>;
}
