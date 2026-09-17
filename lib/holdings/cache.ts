/**
 * V3-WALLET-002 — caching for wallet holdings deliberately has no cache
 * layer of its own beyond what `base.getEthBalance`/
 * `blockscout.getAddressTokenBalances`/`coingecko.getTokenPriceByAddress`
 * already do (each already `getOrSet`-cached, address-keyed, on real TTLs —
 * see each service function's own doc comment). This module exists only to
 * let a manual "Refresh" genuinely force a fresh read, by invalidating the
 * exact keys those functions use — duplicating the key format here is a
 * real coupling, but it's the same coupling `withStaleFallback` callers
 * already accept (a cache key is effectively part of a service function's
 * public contract in this codebase), and it keeps `invalidate` itself
 * (`lib/providers/common/cache.ts`) generic rather than wallet-specific.
 */

import { invalidate } from "@/lib/providers/common/cache";

export function invalidateHoldingsCache(address: string): void {
  const normalizedAddress = address.toLowerCase();
  invalidate(`base:eth-balance:${normalizedAddress}`);
  invalidate(`blockscout:token-balances:${normalizedAddress}`);
}
