/**
 * V3-WALLET-002 — fills in USD prices `discovery.ts` couldn't already
 * provide. Blockscout's token-balances call already carries a real price
 * (`exchange_rate`) for most tokens it recognizes, so this only ever makes
 * extra requests for the two real gaps:
 *   - native ETH, which Blockscout's token-balances endpoint never prices
 *     (it isn't a token) — resolved via the same `getMajorPrices()` the
 *     Topbar's live ticker already uses (`ethereum`/`bitcoin` simple price).
 *   - any ERC-20 whose `exchange_rate` came back `null` — a real, expected
 *     outcome for a less common token, resolved via CoinGecko's
 *     contract-address lookup (`getTokenPriceByAddress`), one request per
 *     *unique* address needing it, deduplicated and run in parallel — never
 *     one request per holding regardless of duplicates, and never a request
 *     at all for a token Blockscout already priced.
 */

import { getMajorPrices, getTokenPriceByAddress } from "@/lib/providers/coingecko/service";
import type { DiscoveredTokenBalance } from "@/lib/providers/blockscout/service";

export type PricingResult = {
  nativeEthUsdPrice: number | null;
  /** Same tokens `discovery.ts` returned, in the same order, with `usdPrice` filled in wherever a fallback lookup found one. Never removes or reorders entries. */
  tokens: DiscoveredTokenBalance[];
};

export async function priceHoldings(tokens: DiscoveredTokenBalance[], includeNativeEth: boolean): Promise<PricingResult> {
  const needsFallbackPrice = Array.from(new Set(tokens.filter((t) => t.usdPrice === null).map((t) => t.address)));

  const [ethPriceResult, ...fallbackPrices] = await Promise.all([
    includeNativeEth ? getMajorPrices() : Promise.resolve(null),
    ...needsFallbackPrice.map((address) => getTokenPriceByAddress(address)),
  ]);

  const fallbackPriceByAddress = new Map<string, number | null>(needsFallbackPrice.map((address, i) => [address, fallbackPrices[i]]));

  return {
    nativeEthUsdPrice: ethPriceResult?.ok ? ethPriceResult.data.eth.usd : null,
    tokens: tokens.map((token) => (token.usdPrice !== null ? token : { ...token, usdPrice: fallbackPriceByAddress.get(token.address) ?? null })),
  };
}
