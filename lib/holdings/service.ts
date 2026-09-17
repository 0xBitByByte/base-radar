/**
 * V3-WALLET-002 — the one orchestrator every caller (the `"use server"`
 * action, and nothing else) goes through: discover → price → normalize,
 * with an honest early exit for the one real chain gap this feature has.
 */

import { discoverHoldings } from "@/lib/holdings/discovery";
import { priceHoldings } from "@/lib/holdings/pricing";
import { normalizeHoldings } from "@/lib/holdings/normalize";
import { invalidateHoldingsCache } from "@/lib/holdings/cache";
import { isHoldingsSupportedChain } from "@/lib/holdings/chains";
import type { Holdings } from "@/lib/holdings/types";

export async function getHoldings(address: string, chainId: number): Promise<Holdings> {
  if (!isHoldingsSupportedChain(chainId)) {
    return {
      address,
      chainId,
      assets: [],
      totalUsdValue: 0,
      fetchedAt: new Date().toISOString(),
      partial: true,
    };
  }

  const discovery = await discoverHoldings(address);
  const pricing = await priceHoldings(discovery.tokens, discovery.nativeEthBalance !== null);

  return normalizeHoldings(
    address,
    chainId,
    "base",
    discovery.nativeEthBalance,
    pricing.nativeEthUsdPrice,
    pricing.tokens,
    discovery.partial
  );
}

export async function refreshHoldings(address: string, chainId: number): Promise<Holdings> {
  invalidateHoldingsCache(address);
  return getHoldings(address, chainId);
}
