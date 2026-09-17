/**
 * V3-WALLET-002 — split out from `service.ts` deliberately: a pure module
 * with no `fetch`/provider-layer import, the same "pure module with no
 * client.ts import" split `base/rateLimitStatus.ts`/`blockscout/
 * rateLimitStatus.ts` already establish. `usePortfolio.ts` (a `"use
 * client"` hook) needs this check without pulling `service.ts`'s real
 * network-calling code — and everything it transitively imports — into the
 * client bundle.
 */

import { base } from "viem/chains";

/**
 * `lib/providers/base/client.ts`'s RPC URL and `lib/providers/blockscout/
 * client.ts`'s API host are both hardcoded to Base Mainnet — real,
 * pre-existing, shared code this feature deliberately doesn't fork into a
 * per-chain variant (every other consumer of those two providers, e.g. the
 * Topbar's live ticker, is mainnet-only too). `lib/wallet/chains.ts` treats
 * Base Sepolia as a genuinely supported *wallet* chain, so a connected
 * wallet really can be on it — this just means holdings discovery honestly
 * can't answer for that chain yet, rather than silently querying mainnet
 * and showing the wrong wallet's balances under a Sepolia connection.
 */
export function isHoldingsSupportedChain(chainId: number): boolean {
  return chainId === base.id;
}
