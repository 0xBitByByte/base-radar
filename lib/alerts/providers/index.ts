/**
 * The Alert Sources aggregator — the one place that knows all five
 * providers exist. `lib/alerts/service.ts` calls `fetchAllProviderAlerts()`
 * and gets back a flat `Alert[]`; it never imports an individual provider
 * module itself, and no UI component imports anything from this folder at
 * all — "the UI should never know where an alert comes from" holds at the
 * type level, not just by convention.
 *
 * Every provider runs in parallel via `Promise.allSettled` — one
 * provider's rejection (a network error, a parse failure) never takes
 * down the others; a failed provider simply contributes zero alerts for
 * this pass, exactly like every other resilience boundary already in this
 * codebase (`sources.ts`, `lib/whale`, `lib/governance`).
 */

import { blockscoutAlertProvider } from "@/lib/alerts/providers/blockscout";
import { coingeckoAlertProvider } from "@/lib/alerts/providers/coingecko";
import { defillamaAlertProvider } from "@/lib/alerts/providers/defillama";
import { githubAlertProvider } from "@/lib/alerts/providers/github";
import { snapshotAlertProvider } from "@/lib/alerts/providers/snapshot";
import type { AlertProvider } from "@/lib/alerts/providers/types";
import type { Alert } from "@/lib/alerts/types";

export const ALERT_PROVIDERS: AlertProvider[] = [
  githubAlertProvider,
  snapshotAlertProvider,
  coingeckoAlertProvider,
  defillamaAlertProvider,
  blockscoutAlertProvider,
];

export async function fetchAllProviderAlerts(): Promise<Alert[]> {
  const results = await Promise.allSettled(ALERT_PROVIDERS.map((provider) => provider.fetchAlerts()));
  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

export type { AlertProvider } from "@/lib/alerts/providers/types";
