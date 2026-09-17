/** Public API for the Blockscout provider — cache- and rate-limit-guarded. */

import { fetchAddressInfo, fetchAddressTokenBalances, fetchChainStats, fetchContractDetail, fetchRecentSmartContracts, fetchTokenTransfers } from "@/lib/providers/blockscout/client";
import {
  mapChainStats,
  mapContractDetail,
  mapDiscoveredTokenBalances,
  mapRecentlyVerifiedContract,
  mapTokenTransfers,
  type ChainStats,
  type ContractDetail,
  type DiscoveredTokenBalance,
  type TokenTransfer,
  type VerifiedContract,
} from "@/lib/providers/blockscout/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { ProviderHttpError, ProviderParseError } from "@/lib/providers/common/errors";
import { assertRateLimit, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult, withStaleFallback } from "@/lib/providers/common/utilities";

const PROVIDER = "blockscout" as const;
const CACHE_TTL_MS = 60_000; // live chain-stats ticker only (getChainStats) — matches the window documented in docs/API.md
// PR-098.07 — contract-verification calls (`getRecentlyVerifiedContract`,
// `getContractDetail`) split off the shared 60s ticker TTL above into their
// own named constant: verification status is close to static (the
// "Security" freshness class, 30-60min — `lib/intelligence/freshness.ts`),
// nothing like `getChainStats`' live network-health numbers. Split rather
// than bumping the shared constant, which would have also slowed down the
// unrelated chain-stats ticker.
const SECURITY_CACHE_TTL_MS = 2_700_000;
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

/**
 * Final Production Hardening PR — moved to `blockscout/rateLimitStatus.ts`
 * (a pure module with no `client.ts`/fetch import), re-exported here so
 * every existing server-side consumer of `"@/lib/providers/blockscout/service"`
 * is unaffected.
 */
export { getRateLimitStatus } from "@/lib/providers/blockscout/rateLimitStatus";

/**
 * Final Production Readiness PR — feeds the topbar's live Block/Gas/
 * Transactions ticker, a prominent, high-traffic read on every dashboard
 * page. A transient Blockscout failure now degrades to the last real,
 * successfully-fetched value (`withStaleFallback`, honestly tagged
 * `stale: true`) instead of blanking the ticker entirely.
 */
export async function getChainStats(): Promise<ProviderResult<ChainStats>> {
  const cacheKey = `${PROVIDER}:chain-stats`;
  const result = await toProviderResult(PROVIDER, () =>
    getOrSet(cacheKey, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchChainStats();
      return mapChainStats(raw);
    })
  );
  return withStaleFallback(PROVIDER, cacheKey, result);
}

/**
 * V1-IMPLEMENT-001 (ADR V1-BLOCKER-001, Phase 1) — same `withStaleFallback`
 * pattern already used by `getChainStats` above and `github.getRepoStats`:
 * a genuine failure (Blockscout down, rate-limited, timed out) degrades to
 * the last real, successfully-fetched value for this exact cache key,
 * honestly tagged `stale: true` by `withStaleFallback` itself, rather than
 * surfacing an empty "recently verified" read. No effect on the healthy
 * path — `withStaleFallback` returns `result` unchanged whenever
 * `result.ok` is true.
 */
export async function getRecentlyVerifiedContract(): Promise<ProviderResult<VerifiedContract>> {
  const cacheKey = `${PROVIDER}:recently-verified`;
  const result = await toProviderResult(PROVIDER, () =>
    getOrSet(cacheKey, SECURITY_CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchRecentSmartContracts();
      const mapped = mapRecentlyVerifiedContract(raw);
      if (!mapped) throw new ProviderParseError(PROVIDER, "No recently verified contracts returned");
      return mapped;
    })
  );
  return withStaleFallback(PROVIDER, cacheKey, result);
}

const TOKEN_TRANSFERS_CACHE_TTL_MS = 30_000;

/**
 * Most recent transfers for a single ERC-20 token contract — used for
 * whale-transfer detection (`lib/whale`).
 *
 * V1-IMPLEMENT-001 (ADR V1-BLOCKER-001, Phase 1) — same `withStaleFallback`
 * pattern as `getChainStats`/`getRecentlyVerifiedContract` above; see that
 * function's own doc comment for the rationale. No effect on the healthy
 * path.
 */
export async function getTokenTransfers(tokenAddress: string): Promise<ProviderResult<TokenTransfer[]>> {
  const cacheKey = `${PROVIDER}:token-transfers:${tokenAddress}`;
  const result = await toProviderResult(PROVIDER, () =>
    getOrSet(cacheKey, TOKEN_TRANSFERS_CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchTokenTransfers(tokenAddress);
      return mapTokenTransfers(raw);
    })
  );
  return withStaleFallback(PROVIDER, cacheKey, result);
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
 *
 * V1-IMPLEMENT-001 (ADR V1-BLOCKER-001, Phase 1) — same `withStaleFallback`
 * pattern as `getChainStats`/`getRecentlyVerifiedContract`/`getTokenTransfers`
 * above. Only ever engages for a genuine failure (network/5xx/timeout) — a
 * real 404 ("unverified") is already handled above as a successful,
 * non-thrown result and is never routed through this fallback. No effect on
 * the healthy path.
 */
export async function getContractDetail(address: string): Promise<ProviderResult<ContractDetail>> {
  const cacheKey = `${PROVIDER}:contract-detail:${address}`;
  const result = await toProviderResult(PROVIDER, () =>
    getOrSet(cacheKey, SECURITY_CACHE_TTL_MS, async () => {
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
  return withStaleFallback(PROVIDER, cacheKey, result);
}

const TOKEN_BALANCES_CACHE_TTL_MS = 30_000;

/**
 * V3-WALLET-002 — every real ERC-20 balance for a connected wallet, in one
 * call (see `fetchAddressTokenBalances`'s own doc comment for why this is
 * the actual discovery mechanism, not a hardcoded token list). Per-address,
 * so the cache key includes the (lowercased) address, same pattern
 * `base.getEthBalance` uses for the same reason.
 */
export async function getAddressTokenBalances(address: string): Promise<ProviderResult<DiscoveredTokenBalance[]>> {
  const normalizedAddress = address.toLowerCase();
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:token-balances:${normalizedAddress}`, TOKEN_BALANCES_CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchAddressTokenBalances(normalizedAddress);
      return mapDiscoveredTokenBalances(raw);
    })
  );
}

export type { ChainStats, ContractDetail, DiscoveredTokenBalance, TokenTransfer, VerifiedContract };

/**
 * Final Production Hardening PR — `contractDetailsByAddress`/
 * `ContractDetailEntry` moved to `blockscout/contractDetails.ts` (a pure,
 * no-fetch module) so the three `"use client"` components that need them
 * can import them without pulling this file's real `fetch()`-calling code
 * into the client bundle. Re-exported here so every existing server-side
 * consumer of `"@/lib/providers/blockscout/service"` is unaffected.
 */
export { contractDetailsByAddress, type ContractDetailEntry } from "@/lib/providers/blockscout/contractDetails";
