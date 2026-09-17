/**
 * V3-WALLET-002 — asset discovery: what does this wallet actually hold, on
 * Base, right now. Two real sources, fetched in parallel:
 *   - native ETH balance, via `lib/providers/base/service.ts`'s
 *     `getEthBalance` (Base's own public RPC, `eth_getBalance`).
 *   - every ERC-20 balance, via `lib/providers/blockscout/service.ts`'s
 *     `getAddressTokenBalances` — Blockscout already indexes every transfer
 *     this address has ever received, so this is real discovery, not a
 *     hardcoded token list that could miss something.
 *
 * Deliberately thin: no pricing, no formatting, no allocation math here —
 * see `pricing.ts` and `normalize.ts`. `Promise.allSettled`, not
 * `Promise.all`: a genuine RPC/Blockscout outage on one source shouldn't
 * discard a real, already-fetched result from the other (the task's own
 * "show partial portfolio whenever possible" requirement, applied at the
 * earliest point it can be).
 */

import { getEthBalance } from "@/lib/providers/base/service";
import { getAddressTokenBalances, type DiscoveredTokenBalance } from "@/lib/providers/blockscout/service";

export type DiscoveryResult = {
  nativeEthBalance: bigint | null;
  tokens: DiscoveredTokenBalance[];
  /** True when either source failed — the caller's honest signal to mark the eventual `Holdings.partial` flag. */
  partial: boolean;
};

export async function discoverHoldings(address: string): Promise<DiscoveryResult> {
  const [ethResult, tokensResult] = await Promise.allSettled([getEthBalance(address), getAddressTokenBalances(address)]);

  const ethSettled = ethResult.status === "fulfilled" ? ethResult.value : null;
  const tokensSettled = tokensResult.status === "fulfilled" ? tokensResult.value : null;

  const ethOk = ethSettled?.ok === true;
  const tokensOk = tokensSettled?.ok === true;

  return {
    nativeEthBalance: ethOk ? ethSettled.data : null,
    tokens: tokensOk ? tokensSettled.data : [],
    partial: !ethOk || !tokensOk,
  };
}
