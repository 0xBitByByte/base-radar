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
 *
 * V1-FIX-006B — each provider's own `fetchJson` calls already carry a
 * per-HTTP-request timeout (`lib/providers/common/utilities.ts`, 8s + 2
 * retries), but nothing previously bounded a provider's OWN aggregate work
 * across multiple such calls. `defillamaAlertProvider.fetchAlerts()`
 * specifically calls DefiLlama's per-protocol history endpoint once per
 * tracked project with a `defillamaSlug` — empirically measured at ~5.5s
 * per call from this environment — so with no ceiling on the provider
 * itself, `Promise.allSettled` below waited for however long THAT took,
 * confirmed live at 20-26s+ per refresh. `PROVIDER_TIMEOUT_MS` caps each
 * provider individually: one that hasn't settled within the budget is
 * treated exactly like a rejected one (zero alerts this pass, real data
 * next time) rather than holding up the other four or the caller.
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

/** Same order as `ALERT_PROVIDERS` — `AlertProvider` is a plain object literal (see its own doc comment), so there's no `.name`/constructor to read a label from; used only to label a timeout error for debugging. */
const ALERT_PROVIDER_NAMES = ["github", "snapshot", "coingecko", "defillama", "blockscout"];

const PROVIDER_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function fetchAllProviderAlerts(): Promise<Alert[]> {
  const results = await Promise.allSettled(
    ALERT_PROVIDERS.map((provider, index) =>
      withTimeout(provider.fetchAlerts(), PROVIDER_TIMEOUT_MS, ALERT_PROVIDER_NAMES[index] ?? `provider[${index}]`)
    )
  );
  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

export type { AlertProvider } from "@/lib/alerts/providers/types";
