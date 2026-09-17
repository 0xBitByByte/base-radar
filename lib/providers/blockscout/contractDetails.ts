/**
 * Final Production Hardening PR — split out of `blockscout/service.ts`.
 *
 * Pure, no-I/O code, deliberately kept in its own module: three
 * `"use client"` components (`ProfileHeaderExplorerTooltipAsync`,
 * `ProfileContractDetailsAsync`, `ProfileVerifiedContractsStatAsync`)
 * import `contractDetailsByAddress` as a value. Live bundle inspection
 * showed that importing it from `blockscout/service.ts` pulled the whole
 * module into the client bundle — including `getChainStats`/
 * `getContractDetail`/`getTokenTransfers` and, transitively,
 * `blockscout/client.ts`'s real `fetch()` calls to `base.blockscout.com`
 * (confirmed by fetching the served chunk and finding `fetchAddressInfo`/
 * `fetchContractDetail`/the literal `base.blockscout.com` URL inside it) —
 * none of that code ever actually runs client-side (nothing in the client
 * bundle calls it; live network/fetch monitoring over a real polling
 * window recorded zero requests to Blockscout), but shipping it adds real,
 * avoidable weight to every page that renders any of those three
 * components. This file has no import of `blockscout/client.ts` or
 * `common/utilities.ts`, so importing it directly cannot pull in the
 * provider's network code, regardless of the bundler's tree-shaking
 * granularity.
 *
 * `blockscout/service.ts` re-exports both symbols below for its own
 * existing (server-only) consumers — nothing there needed to change.
 */

import type { ContractDetail } from "@/lib/providers/blockscout/mapper";
import type { ProviderResult } from "@/lib/providers/common/types";

/**
 * PR-078 FINAL REVIEW — the one shape `page.tsx`'s `contractDetailsPromise`
 * resolves to, previously redefined independently (identically) in four
 * separate `*Async` components (`ProfileContractDetailsAsync`,
 * `ProfileTrustContractsTileAsync`, `ProfileVerifiedContractsStatAsync`,
 * `ProfileSourcesBlockscoutAsync`) — a real, confirmed instance of the
 * "repeated status mapping" this review pass was asked to find and
 * centralize. Every consumer of `contractDetailsPromise` now imports this
 * instead of re-declaring it.
 */
export type ContractDetailEntry = { address: string; result: ProviderResult<ContractDetail> };

/**
 * PR-078 FINAL REVIEW — the one piece of logic every `contractDetailsPromise`
 * consumer independently re-implemented: reshape the resolved entries into
 * an address-keyed map of only the successful lookups. `ClassifyBlockscoutVerification`
 * (`ProfileSources.tsx`) still walks `entries` directly instead of this map —
 * it also needs the *failed* entries' error detail for its own fallback
 * classification, which this map deliberately discards, so that one isn't a
 * duplicate of this, it's genuinely different downstream logic over the same
 * input.
 */
export function contractDetailsByAddress(entries: ContractDetailEntry[]): Record<string, ContractDetail> {
  const map: Record<string, ContractDetail> = {};
  for (const entry of entries) {
    if (entry.result.ok) map[entry.address] = entry.result.data;
  }
  return map;
}
