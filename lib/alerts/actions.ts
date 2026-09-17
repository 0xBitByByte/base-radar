"use server";

/**
 * Release Blockers PR — the exact root cause of a confirmed, live
 * production bug, found via a real captured stack trace (a `beforeInteractive`
 * `fetch` monkey-patch on the actual production server, not a hypothesis):
 * `lib/alerts/service.ts` self-initializes client-side (`if (typeof window
 * !== "undefined") void refreshAlerts()`, by design — a real
 * `useSyncExternalStore` alert store has to live in the browser) and
 * previously called `fetchAllProviderAlerts()` (`lib/alerts/providers`)
 * directly. That function runs all five alert providers — GitHub, Snapshot,
 * CoinGecko, DefiLlama, Blockscout — each of which calls its provider's
 * real `service.ts`, whose `fetch()` calls target third-party REST APIs
 * that don't permit browser-origin CORS requests. Confirmed via the
 * captured stack trace: `blockscoutAlertProvider.fetchAlerts()`'s
 * `buildVerifiedContractAlerts()` was calling `blockscout.getContractDetail()`
 * for every registry project with a Base contract, straight from the
 * browser, on every page load.
 *
 * Same fix as `lib/hooks/liveActions.ts`: the actual provider calls move
 * into a Server Action, so the fetches run where these providers' CORS
 * restrictions don't apply. `refreshAlerts()` keeps its client-side
 * self-init trigger and in-memory store — that part was always correct —
 * it just calls this instead of the provider aggregator directly.
 */

import { fetchAllProviderAlerts } from "@/lib/alerts/providers";
import type { Alert } from "@/lib/alerts/types";

export async function fetchAllProviderAlertsAction(): Promise<Alert[]> {
  return fetchAllProviderAlerts();
}
