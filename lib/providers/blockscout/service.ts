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
import { ProviderParseError } from "@/lib/providers/common/errors";
import { assertRateLimit, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult } from "@/lib/providers/common/utilities";

const PROVIDER = "blockscout" as const;
const CACHE_TTL_MS = 60_000; // matches the window documented in docs/API.md
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

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
 * 0-3). Two real Blockscout endpoints, fetched in parallel, same 60s TTL as
 * every other Blockscout call.
 */
export async function getContractDetail(address: string): Promise<ProviderResult<ContractDetail>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:contract-detail:${address}`, CACHE_TTL_MS, async () => {
      // Two real HTTP requests below (contract-detail + address-info) — one `assertRateLimit` call per request, matching every other multi-fetch service function's convention (e.g. `base.getBaseNetworkStatus`).
      assertRateLimit(PROVIDER, RATE_LIMIT);
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const [contract, addressInfo] = await Promise.all([fetchContractDetail(address), fetchAddressInfo(address)]);
      return mapContractDetail(contract, addressInfo);
    })
  );
}

export type { ChainStats, ContractDetail, TokenTransfer, VerifiedContract };
