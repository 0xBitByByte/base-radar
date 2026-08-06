/** Public API for the Blockscout provider — cache- and rate-limit-guarded. */

import { fetchAddressInfo, fetchChainStats, fetchContractDetail, fetchRecentSmartContracts, fetchTokenTransfers } from "@/lib/providers/blockscout/client";
import {
  mapChainStats,
  mapContractDetail,
  mapRecentlyVerifiedContract,
  mapTokenTransfers,
  type ChainStats,
  type ContractDetail,
  type TokenTransfer,
  type VerifiedContract,
} from "@/lib/providers/blockscout/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { ProviderHttpError, ProviderParseError } from "@/lib/providers/common/errors";
import { assertRateLimit, getRateLimitStatus as getSharedRateLimitStatus, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult } from "@/lib/providers/common/utilities";

const PROVIDER = "blockscout" as const;
const CACHE_TTL_MS = 60_000; // matches the window documented in docs/API.md
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

/**
 * PR-074 REVIEW #8 — real-time read of this provider's own app-enforced
 * rate-limit budget (see `common/rate-limit.ts`'s `getRateLimitStatus`),
 * exposed for the Evidence & Sources panel to report exact remaining/
 * limit/reset numbers instead of a generic "try again later" — the same
 * pattern already built for GitHub's response-header-based tracker.
 */
export function getRateLimitStatus() {
  return getSharedRateLimitStatus(PROVIDER, RATE_LIMIT);
}

export async function getChainStats(): Promise<ProviderResult<ChainStats>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:chain-stats`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchChainStats();
      return mapChainStats(raw);
    })
  );
}

export async function getRecentlyVerifiedContract(): Promise<ProviderResult<VerifiedContract>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:recently-verified`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchRecentSmartContracts();
      const mapped = mapRecentlyVerifiedContract(raw);
      if (!mapped) throw new ProviderParseError(PROVIDER, "No recently verified contracts returned");
      return mapped;
    })
  );
}

const TOKEN_TRANSFERS_CACHE_TTL_MS = 30_000;

/** Most recent transfers for a single ERC-20 token contract — used for whale-transfer detection (`lib/whale`). */
export async function getTokenTransfers(tokenAddress: string): Promise<ProviderResult<TokenTransfer[]>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:token-transfers:${tokenAddress}`, TOKEN_TRANSFERS_CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchTokenTransfers(tokenAddress);
      return mapTokenTransfers(raw);
    })
  );
}

/**
 * PR13.7 Goal 10 — real per-address contract verification metadata
 * (compiler/optimization/license/proxy/implementation/creator/creation-tx),
 * extended/Profile-page-only, only ever called for the small number of
 * contracts actually in a project's registry `contracts` array (typically
 * 0-3). Two real Blockscout endpoints, same 60s TTL as every other
 * Blockscout call.
 *
 * PR-078 §1 — `Promise.all` (which fails the whole call the instant either
 * request rejects) replaced with `Promise.allSettled`, specifically because
 * `fetchContractDetail`'s `/smart-contracts/{address}` genuinely 404s for a
 * real, deployed-but-unverified contract, not just for a bad address —
 * confirmed live against `base.blockscout.com` (a verified Base contract
 * returns 200; the standard burn address, a real non-contract EOA, returns
 * 404 here while `/addresses/{address}` still answers with real
 * `is_contract`/`is_verified` fields). Under the old `Promise.all`, that
 *404 discarded `fetchAddressInfo`'s already-successful response and failed
 * this whole call — which is exactly why `sources.ts`'s separate,
 * chain-wide "most recently verified" heuristic existed as the only signal
 * `ProfileSources.tsx` had to work with, and why it read "Provider
 * Unsupported" for a project whose contract Blockscout actually has an
 * answer for. Only a genuine, non-404 failure (network/5xx/timeout) still
 * fails this call — a 404 is treated as the real, meaningful answer it is.
 */
export async function getContractDetail(address: string): Promise<ProviderResult<ContractDetail>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:contract-detail:${address}`, CACHE_TTL_MS, async () => {
      // Two real HTTP requests below (contract-detail + address-info) — one `assertRateLimit` call per request, matching every other multi-fetch service function's convention (e.g. `base.getBaseNetworkStatus`).
      assertRateLimit(PROVIDER, RATE_LIMIT);
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const [contractSettled, addressSettled] = await Promise.allSettled([fetchContractDetail(address), fetchAddressInfo(address)]);

      const contractNotFound = contractSettled.status === "rejected" && contractSettled.reason instanceof ProviderHttpError && contractSettled.reason.status === 404;
      if (contractSettled.status === "rejected" && !contractNotFound) throw contractSettled.reason;
      if (addressSettled.status === "rejected") throw addressSettled.reason;

      const contract = contractSettled.status === "fulfilled" ? contractSettled.value : null;
      return mapContractDetail(contract, addressSettled.value);
    })
  );
}

export type { ChainStats, ContractDetail, TokenTransfer, VerifiedContract };

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
